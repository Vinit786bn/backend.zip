require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const GitCorrelationEngine = require('./services/git.js');
const { OllamaNemotronAnalyzer } = require('./services/llm.js');
const { createDraftPR } = require('./services/github.js');
const { stripe, PLANS, getPlanByName, requirePlan } = require('./services/billing.js');

const prisma = new PrismaClient();
const app = express();
app.use(cors());

// Webhook endpoint needs raw body
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const projectId = session.client_reference_id;
      const subscriptionId = session.subscription;
      
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = sub.items.data[0].price.id;
      
      let planName = 'starter';
      if (priceId === PLANS.team.priceId) planName = 'team';
      
      await prisma.subscription.upsert({
        where: { project_id: projectId },
        update: {
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          plan: planName,
          status: 'active',
          current_period_end: new Date(sub.current_period_end * 1000),
          analyses_limit: PLANS[planName].analysesPerMonth
        },
        create: {
          project_id: projectId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          plan: planName,
          status: 'active',
          current_period_end: new Date(sub.current_period_end * 1000),
          analyses_limit: PLANS[planName].analysesPerMonth
        }
      });
    } else if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripe_subscription_id: sub.id },
        data: {
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000)
        }
      });
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripe_subscription_id: sub.id },
        data: {
          plan: 'free',
          status: 'canceled',
          analyses_limit: PLANS.free.analysesPerMonth
        }
      });
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await prisma.subscription.updateMany({
          where: { stripe_subscription_id: invoice.subscription },
          data: { analyses_used_this_period: 0 }
        });
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook processing error:', e);
    res.status(500).end();
  }
});

// Regular JSON middleware for other endpoints
app.use(express.json());

const analyzer = new OllamaNemotronAnalyzer();

async function processEvent(event, project) {
  try {
    let sub = await prisma.subscription.findUnique({ where: { project_id: project.id } });
    if (!sub) {
       sub = await prisma.subscription.create({ data: { project_id: project.id, plan: 'free', analyses_limit: PLANS.free.analysesPerMonth } });
    }
    
    if (sub.analyses_limit !== -1 && sub.analyses_used_this_period >= sub.analyses_limit) {
      await prisma.event.update({ where: { id: event.id }, data: { status: 'pending - upgrade to analyze' } });
      return;
    }

    await prisma.event.update({ where: { id: event.id }, data: { status: 'analyzing' } });
    
    let repoPath = process.cwd(); 
    
    const gitEngine = new GitCorrelationEngine(repoPath);
    const correlation = await gitEngine.correlate(event);
    
    let rootCause = 'Analysis pending';
    let suggestedFix = '';
    let confidence = 0;
    
    if (correlation) {
      const payload = {
        error_message: event.error_message,
        stack_trace: event.stack_trace,
        commit_diff: correlation.commit_diff,
        file_context: correlation.file_context,
        recent_commits: correlation.recent_commits
      };
      
      try {
        const analysis = await analyzer.analyze(payload);
        rootCause = analysis.rootCause;
        suggestedFix = analysis.suggestedFix;
        confidence = analysis.confidence;
        
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { analyses_used_this_period: { increment: 1 } }
        });
      } catch (e) {
        console.error('LLM Analysis failed:', e.message);
        rootCause = 'LLM analysis failed: ' + e.message;
      }
    } else {
      rootCause = 'Could not correlate error with git history.';
    }
    
    await prisma.analysis.create({
      data: {
        event_id: event.id,
        root_cause_summary: rootCause,
        suggested_fix_diff: suggestedFix,
        confidence_score: confidence || 0,
        llm_model_used: analyzer.model
      }
    });
    
    await prisma.event.update({ where: { id: event.id }, data: { status: 'analyzed' } });
  } catch(e) {
    console.error('Failed to process event', event.id, e);
    await prisma.event.update({ where: { id: event.id }, data: { status: 'error' } });
  }
}

async function authenticateSDK(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const apiKey = authHeader.split(' ')[1];
  try {
    const project = await prisma.project.findUnique({ where: { api_key: apiKey } });
    if (!project) return res.status(401).json({ error: 'Invalid API key' });
    req.project = project;
    next();
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

app.post('/api/projects', async (req, res) => {
  try {
    const { name, github_repo_url } = req.body;
    const api_key = crypto.randomBytes(32).toString('hex');
    const project = await prisma.project.create({
      data: { name, github_repo_url, api_key }
    });
    await prisma.subscription.create({ data: { project_id: project.id, plan: 'free', analyses_limit: PLANS.free.analysesPerMonth } });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/events', authenticateSDK, async (req, res) => {
  try {
    const { events } = req.body;
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid events payload' });
    }

    const createdEvents = [];
    for (const event of events) {
      const created = await prisma.event.create({
        data: {
          project_id: req.project.id,
          stack_trace: event.stack_trace,
          error_message: event.error_message,
          route: event.route,
          method: event.method,
          commit_hash: event.commit_hash,
          environment_json: event.environment_json,
          severity: event.severity || 'error',
          status: 'new'
        }
      });
      createdEvents.push(created);
      
      processEvent(created, req.project);
    }
    res.json({ success: true, count: createdEvents.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events/:id/create-pr', requirePlan(prisma, 'prAutomation'), async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { analysis: true, project: true }
    });
    if (!event || !event.analysis) return res.status(400).json({ error: 'No analysis found' });
    const prUrl = await createDraftPR(event, event.project, event.analysis);
    res.json({ url: prUrl });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { created_at: 'desc' },
      include: { analysis: true }
    });
    res.json(events);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { analysis: true, project: true }
    });
    res.json(event);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/billing/status', async (req, res) => {
  try {
    const proj = await prisma.project.findFirst({ include: { subscription: true } });
    if(!proj) return res.json(null);
    res.json(proj.subscription);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/billing/create-checkout-session', async (req, res) => {
  try {
    const { plan, project_id } = req.body;
    const planConfig = getPlanByName(plan);
    if(!planConfig.priceId) return res.status(400).json({ error: 'Invalid plan for checkout' });
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      client_reference_id: project_id,
      success_url: 'http://localhost:5173/billing/success',
      cancel_url: 'http://localhost:5173/billing/canceled'
    });
    res.json({ url: session.url });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/billing/create-portal-session', async (req, res) => {
  try {
    const { project_id } = req.body;
    const sub = await prisma.subscription.findUnique({ where: { project_id } });
    if(!sub || !sub.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer found' });
    
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: 'http://localhost:5173/settings'
    });
    res.json({ url: session.url });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log('Backend running on port ' + PORT);
});
