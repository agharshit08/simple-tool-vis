import sys
import re

file_path = "src/components/charts/NetworkGraph.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Remove from state typing
content = content.replace(
    "const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical'>('force');",
    "const [layoutType, setLayoutType] = useState<'force' | 'grid' | 'hierarchical'>('force');"
)

# 2. Update Dropdown
content = content.replace(
    '<option value="circular">Circular Layout</option>',
    '<option value="grid">Grid Layout</option>'
)

# 3. Update D3 Logic
old_logic = """    } else if (layoutType === 'circular') {
      // Sort nodes by group
      simulationNodes.sort((a, b) => a.group.localeCompare(b.group));
      const radius = Math.min(width, height) / 2.5;
      simulationNodes.forEach((n: any, i) => {
        const angle = (i / simulationNodes.length) * 2 * Math.PI;
        n.x = width / 2 + radius * Math.cos(angle);
        n.y = height / 2 + radius * Math.sin(angle);
      });
      // Need a static setup, no simulation required."""

new_logic = """    } else if (layoutType === 'grid') {
      // 2D Grid Layout
      simulationNodes.sort((a, b) => b.count - a.count);
      const cols = Math.ceil(Math.sqrt(simulationNodes.length));
      const spacingX = width / (cols + 1);
      const spacingY = height / (Math.ceil(simulationNodes.length / cols) + 1);
      
      simulationNodes.forEach((n: any, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        n.x = spacingX + col * spacingX;
        n.y = spacingY + row * spacingY;
      });"""

content = content.replace(old_logic, new_logic)

# 4. Fix node drag restriction
content = content.replace("if (layoutType !== 'circular') {", "if (layoutType !== 'grid') {")

with open(file_path, "w") as f:
    f.write(content)

print("Updated NetworkGraph to replace Circular with Grid.")
