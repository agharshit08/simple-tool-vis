import re

with open('/Users/harshitagrawal/.gemini/antigravity/brain/8eeec6fb-d75b-4576-8e2b-43f22fd01275/.system_generated/steps/625/content.md', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract code from devsite-code or pre tags
blocks = re.findall(r'<pre.*?>(.*?)</pre>', html, flags=re.DOTALL)
for i, c in enumerate(blocks):
    print(f"--- CODE {i} ---")
    # replace HTML entities like &lt; and &gt;
    c = c.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    c = re.sub(r'<[^>]+>', '', c)
    print(c.strip())

