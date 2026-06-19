import re
with open('/Users/harshitagrawal/.gemini/antigravity/brain/8eeec6fb-d75b-4576-8e2b-43f22fd01275/.system_generated/steps/625/content.md', 'r') as f:
    text = f.read()
# Extract text inside <pre> tags
code_blocks = re.findall(r'<pre.*?>(.*?)</pre>', text, re.DOTALL)
for i, block in enumerate(code_blocks):
    print(f"--- BLOCK {i} ---")
    # clean HTML tags
    cleaned = re.sub(r'<[^>]+>', '', block)
    print(cleaned)
