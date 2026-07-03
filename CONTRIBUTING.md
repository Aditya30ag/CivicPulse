# Contributing to Civic Pulse

Thank you for your interest in contributing to **Civic Pulse**! We welcome contributions from developers of all skill levels to help make citizen-to-administration communication smarter, faster, and more transparent.

By contributing to this project, you agree to abide by our code of conduct and contribution guidelines.

---

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Submitting Pull Requests](#submitting-pull-requests)
3. [Development Setup](#development-setup)
4. [Style Guide & Best Practices](#style-guide--best-practices)
5. [License](#license)

---

## Code of Conduct

To foster an inclusive, welcoming, and productive community, we ask all contributors to:
- Be respectful, professional, and empathetic to others.
- Focus on constructive feedback and collaboration.
- Avoid any form of harassment, discrimination, or offensive behavior.

---

## How to Contribute

### Reporting Bugs

If you find a bug, please check the [GitHub Issues](https://github.com/Aditya30ag/CivicPulse/issues) first to see if it has already been reported. If not, open a new issue and include:
- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected vs. actual behavior.
- Screenshots or error logs (if applicable).
- Environment details (Browser version, OS, etc.).

### Suggesting Enhancements

Have an idea to improve Civic Pulse? Open a feature request in GitHub Issues and describe:
- The problem you want to solve.
- Your proposed solution or user flow.
- The value this adds to citizens or city administrators.

### Submitting Pull Requests

1. **Fork the Repository** and clone it to your local machine.
2. **Create a Feature Branch** off the `development` branch:
   ```bash
   git checkout development
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes** with clear, descriptive commit messages.
4. **Push to your fork** and submit a Pull Request (PR) to the `development` branch of the main repository.

---

## Development Setup

For detailed guidelines on setting up Civic Pulse on your local machine, configuring Firebase, Gemini AI, and Cloudinary, please refer to our setup guide:

👉 [**STEPUP.md**](STEPUP.md)

### Key commands to keep in mind:
- **Start Local Server:** `npm run dev`
- **TypeScript & Linting Check:** `npm run lint`
- **Build Production Assets:** `npm run build`

Please ensure that `npm run lint` passes with no errors before submitting your pull request.

---

## Style Guide & Best Practices

- **TypeScript**: Make sure to use proper TypeScript typing instead of resorting to `any`.
- **React & Hooks**: Use functional components with hooks. Keep components clean, modular, and reusable.
- **Styling**: We use Tailwind CSS v4. Stick to utility classes and follow the design guidelines. Avoid adding arbitrary inline CSS unless necessary.
- **AI Tracing & Deduplication**: If modifying agent workflows, ensure they log detailed step-by-step traces so users/admins can audit AI logic.
- **Git Commit Messages**: Keep commit messages concise, beginning with an imperative verb (e.g., `feat: add community verification counter`, `fix: map reload crash`).

---

## License

By contributing, you agree that your contributions will be licensed under the project's **GNU General Public License v3.0** (GPL-3.0). See the [LICENSE](LICENSE) file for more details.
