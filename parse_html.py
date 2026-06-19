import re

with open('/Users/harshitagrawal/.gemini/antigravity/brain/8eeec6fb-d75b-4576-8e2b-43f22fd01275/.system_generated/steps/625/content.md', 'r', encoding='utf-8') as f:
    html = f.read()

# remove script and style elements
html = re.sub(r'<script.*?>.*?</script>', '', html, flags=re.DOTALL)
html = re.sub(r'<style.*?>.*?</style>', '', html, flags=re.DOTALL)
html = re.sub(r'<devsite-code.*?>.*?</devsite-code>', '', html, flags=re.DOTALL)

# get all code snippets
code_blocks = re.findall(r'<code[^>]*>(.*?)</code>', html, flags=re.DOTALL)
for i, c in enumerate(code_blocks):
    print(f"--- CODE {i} ---")
    c = re.sub(r'<[^>]+>', '', c)
    print(c.strip())

