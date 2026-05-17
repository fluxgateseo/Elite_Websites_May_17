import os

class EliteWebArchitect:
    def __init__(self, project_name):
        self.project_name = project_name
        self.levels = {
            1: "Foundation (Prompts & Frameworks)",
            2: "Education (UI/UX Skill Injection)",
            3: "Visual Direction (Screenshot Analysis)",
            4: "The Cloner (Source Code Teardown)",
            5: "Custom Assets (AI Art & Motion)",
            6: "Iterative Polish (Outside Tools)",
            7: "Frontier (3D & WebGL)"
        }

    def generate_master_config(self):
        """Creates a custom instructions file for Claude Code."""
        config_content = f"""
# PROJECT: {self.project_name}
# ROLE: Lead Frontend Architect
# FOCUS: 7 Levels of Elite Web Design

# GUIDELINES:
- No 'AI Slop' gradients.
- Use 8pt grid spacing.
- Implement staggered animations (Framer Motion).
- Typography focus: Clamp-based responsive scaling.
        """
        with open(".claudecode_instructions", "w") as f:
            f.write(config_content.strip())
        print(f"✅ Created .claudecode_instructions for {self.project_name}")

    def teardown_helper(self, html_file):
        """Prepares raw HTML for Claude to analyze (Level 4)."""
        if not os.path.exists(html_file):
            print("❌ Source file not found.")
            return

        print(f"🔍 Analyzing {html_file} for Elite Patterns...")
        # In a real scenario, you'd use BeautifulSoup here to strip
        # tracking scripts and keep only bones/styles/muscles.
        print("💡 TIP: Copy the output to Claude and say '/teardown'")

    def get_prompt(self, level):
        """Returns the specific master prompt for the chosen level."""
        prompts = {
            3: "Analyze these screenshots. Identify the 'Design Language' and convert it to Tailwind config.",
            5: "Generate a 15s subtle motion background strategy for the Hero section. Use parallax for depth.",
            6: "Review current glassmorphism implementation. Add 'Premium Polish' via backdrop-filters and grain textures."
        }
        return prompts.get(level, "Prompt not defined for this level yet.")

# --- Execution ---
if __name__ == "__main__":
    # Initialize your project (e.g., Argus)
    app = EliteWebArchitect("Argus_Intelligence")

    print(f"--- Welcome to {app.project_name} Orchestrator ---")
    app.generate_master_config()

    # Example: Getting a Level 5 Polish Prompt
    print(f"\n🚀 [LEVEL 5 PROMPT]:\n{app.get_prompt(5)}")
