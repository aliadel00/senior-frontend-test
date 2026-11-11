# Senior Front End (Angular) Developer

## Overview

This assignment is designed to evaluate your expertise in Front End (Angular) development, including architectural decisions, performance optimization, testing practices, and modern Angular features.

## Design Link

> [FigmaLink](https://www.figma.com/design/inRRwrw0RP3v5eIXVx6grq/senior---frontend?node-id=0-1&p=f&t=YkfUtvLYAgw1c0Ld-0)

---

### **Must Do**

We expect you to:

- **Modern Angular features** like Standalone Components, Signals, ...
- **Best practices** like lazy loading, ...
- Use angular testing best practices like unit testing, integration testing, ...
- **Performance Optimization**: Use Angular's built-in tools like Change Detection Strategy, OnPush, and TrackFunction
- **Code Splitting**: Implement lazy loading for feature modules to optimize initial load time
- **Caching**: Use HTTP Interceptors or NgRx Effects to cache API responses

## Project: Task Management Dashboard

Build a modern, production-ready Task Management Dashboard application that demonstrates your proficiency with Angular 20/21.next and enterprise-level development practices.

---

## Requirements

### 1. Core Functionality

#### Task Management

- **Create Tasks**: Add new tasks with title, description, priority (Low/Medium/High), status, due date, and assignee
- **Edit Tasks**: Update existing task details inline or via modal
- **Delete Tasks**: Remove tasks with confirmation dialog
- **Task Filtering**: Filter by status (To Do, In Progress, Done), priority, and assignee
- **Task Search**: Real-time search across task titles and descriptions
- **Drag & Drop**: Implement drag-and-drop to reorder tasks and change status (Optional; would be awesome to do it)

#### Dashboard Features

- **Statistics Cards**: Display total tasks, completed tasks, in-progress tasks, and overdue tasks
- **Task Analytics**: Visual charts showing task distribution by priority and status (use Chart.js or similar)
- **Recent Activity Feed**: Show recent changes/updates to tasks
- **User Management**: Simple user list to assign tasks (can be mocked data)

### 2. Technical Requirements

#### Architecture & Patterns

- Use **Standalone Components** (Angular 20/21.next feature)
- Implement **Smart/Presentational (dumb) Component** pattern
- Use **Signals** for reactive state management where appropriate
- Apply **Dependency Injection** best practices
- Follow **SOLID principles** and clean code architecture

#### Forms

- Use **Reactive Forms** with:
  - Custom form validators
  - Dynamic form controls
  - Form state management
  - Proper error handling and display

#### API Integration (Check the DATA_README.md for more details)

- Create a mock backend service using:
  - In-memory Web API or JSON Server
  - Proper HTTP error handling
  - Loading states and retry logic
  - Use the New HTTPResource to handle the API requests

#### Performance Optimization

- Implement:
  - OnPush change detection strategy
  - Lazy loading and code splitting
  - Proper RxJS operator usage (avoid memory leaks)

#### Styling & UI/UX

- Use **Angular Material** or **PrimeNG** component library
- Implement **responsive design** (mobile, tablet, desktop) => (We didn't give you mobile/tablet design we expect you to use the desktop design as the base and make it responsive)
- Include proper loading states Or skeleton screens
- Implement smooth animations and transitions
- Follow accessibility (a11y) best practices

### 3. Testing Requirements

- **Unit Tests**: Achieve minimum 80% code coverage

  - Component tests with whatever you think is the best testing tool for Angular
  - Service tests with proper mocking

### 4. Code Quality

- Implement **ESLint** with Angular recommended rules/Your own rules
- Follow **Angular Style Guide**
- Use **Prettier** for code formatting
- Use Husky to run ESLint and Prettier on pre-commit
- Add comprehensive **JSDoc comments** for complex logic
- Include **Git commits** with meaningful messages (conventional commits preferred)

### 5. Documentation

Provide a comprehensive README with:

- Project overview and architecture decisions
- Setup and installation instructions
- Environment configuration
- Available scripts and commands
- Design patterns and state management explanation
- Testing strategy
- Performance optimization techniques used
- Known limitations and future improvements

---

## Bonus Points

- **CI/CD Pipeline**: GitHub Actions for automated testing and build
- **Docker**: Containerized application with docker-compose
- **Internationalization (i18n)**: Multi-language support

- **Accessibility Audit**: WCAG 2.1 AA compliance
- **Performance Metrics**: Lighthouse score > 90

---

## Evaluation Criteria

### Technical Excellence (40%)

- Code quality, architecture, and design patterns
- Proper use of Angular features and best practices
- TypeScript usage and type safety
- Performance optimization techniques

### Functionality (30%)

- Feature completeness and correctness
- Edge case handling
- User experience and UI polish

### Testing (15%)

- Test coverage and quality
- Test organization and maintainability
- Proper use of testing utilities

### Documentation & Communication (15%)

- Code readability and comments
- README quality
- Git commit history
- Architectural decision documentation

---

## Submission Guidelines

1. **Repository**: Push your code to a public GitHub repository
2. **README**: Include all required documentation
3. **Live Demo** (Optional): Deploy to GitHub Pages
4. **Video Walkthrough** (Optional): 5-10 minute explanation of your implementation

---

## Questions & Support

If you have questions about requirements or need clarification, don't hesitate to ask us.

---

## Notes

- Feel free to use any additional libraries that enhance the solution
- Explain your technology choices in the README
- Focus on code quality over feature quantity
- Show your problem-solving approach and architectural thinking

---

**Good luck! We're excited to see your solution.**

---

> **This assignment reflects real-world scenarios you'll encounter in our engineering team. We value clean code, thoughtful architecture, and attention to detail.**
