const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123');

const PLANS = {
  free:       { priceId: null,  analysesPerMonth: 50,   projects: 1,  hostedLLM: false, prAutomation: false },
  starter:    { priceId: process.env.STRIPE_STARTER_PRICE_ID, analysesPerMonth: 500,  projects: 3,  hostedLLM: true,  prAutomation: false },
  team:       { priceId: process.env.STRIPE_TEAM_PRICE_ID, analysesPerMonth: 5000, projects: -1, hostedLLM: true,  prAutomation: true  },
  enterprise: { priceId: null, analysesPerMonth: -1,  projects: -1, hostedLLM: true, prAutomation: true }
};

function getPlanByName(name) {
  return PLANS[name] || PLANS.free;
}

function requirePlan(prisma, feature) {
  return async (req, res, next) => {
    try {
      let projectId;
      if (req.project) {
         projectId = req.project.id;
      } else if (req.params.id) {
         const event = await prisma.event.findUnique({ where: { id: req.params.id } });
         if (event) projectId = event.project_id;
      }
      
      if (!projectId) return res.status(400).json({ error: 'Cannot determine project for billing check' });
      
      const sub = await prisma.subscription.findUnique({ where: { project_id: projectId } });
      const planName = sub?.plan || 'free';
      const plan = getPlanByName(planName);
      
      if (!plan[feature]) {
        return res.status(403).json({ error: 'Feature requires a plan upgrade.' });
      }
      req.subscription = sub;
      next();
    } catch(e) {
      res.status(500).json({ error: 'Billing check failed' });
    }
  };
}

module.exports = { stripe, PLANS, getPlanByName, requirePlan };
