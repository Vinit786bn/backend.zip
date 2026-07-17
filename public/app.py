from airllm import AutoModel
import torch

print("--- Step 1: Initializing Compact DeepSeek Engine ---")
# Using a small distilled version ensures your system RAM or SSD doesn't choke
model_id = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"

try:
    model = AutoModel.from_pretrained(
        model_id,
        compression=None,
        profiling=False
    )
    print("\n--- Step 2: Model Successfully Mapped! ---")
    
    prompt = "State the first law of thermodynamics."
    inputs = model.tokenizer(prompt, return_tensors="pt")
    
    print("\n--- Step 3: Generating Response ---")
    outputs = model.generate(**inputs, max_new_tokens=50)
    
    response = model.tokenizer.decode(outputs, skip_special_tokens=True)
    print(f"\n[Result]: {response}")

except Exception as e:
    print(f"\n[Execution Error]: {str(e)}")
