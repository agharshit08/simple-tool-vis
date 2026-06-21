import sys

file_path = "src/components/charts/NetworkGraph.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Remove from state typing
content = content.replace(
    "const [layoutType, setLayoutType] = useState<'force' | 'grid' | 'hierarchical'>('force');",
    "const [layoutType, setLayoutType] = useState<'force' | 'hierarchical'>('force');"
)

# 2. Update Dropdown
dropdown_old = """            <select className="input select" value={layoutType} onChange={e => setLayoutType(e.target.value as any)} style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
              <option value="force">Force Layout</option>
              <option value="grid">Grid Layout</option>
              <option value="hierarchical">Hierarchical Layout</option>
            </select>"""

dropdown_new = """            <select className="input select" value={layoutType} onChange={e => setLayoutType(e.target.value as any)} style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
              <option value="force">Force Layout</option>
              <option value="hierarchical">Hierarchical Layout</option>
            </select>"""

content = content.replace(dropdown_old, dropdown_new)

# 3. Remove D3 Logic
logic_old = """    } else if (layoutType === 'grid') {
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

content = content.replace(logic_old, "")

# 4. Remove drag restriction since hierarchical and force both support drag/simulation
content = content.replace("if (layoutType !== 'grid') {", "if (true) {")

with open(file_path, "w") as f:
    f.write(content)

print("Updated NetworkGraph to remove Grid layout.")
