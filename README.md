# Desktop Agent

An intelligent AI-powered desktop assistant that can see your screen, understand your tasks, and help automate desktop workflows.

## What is Desktop Agent?

Desktop Agent is a modular AI assistant that combines natural language processing with computer vision to interact with your desktop environment. It can understand what's on your screen, respond to voice commands, manage tasks, and provide intelligent automation.

## What can it do?

### 🖥️ Screen Analysis & Vision
- **See your screen**: Capture and analyze screenshots using AI vision models
- **Find elements**: Locate buttons, forms, text, and interactive elements
- **Extract text**: OCR capabilities to read text from any screen
- **Describe content**: AI-powered screen descriptions and analysis

 

### 📝 Task Management
- **Smart reminders**: Set and manage reminders with intelligent scheduling
- **Task tracking**: Keep track of your todos and deadlines
- **Quick actions**: Predefined shortcuts for common tasks

### 🌤️ Information Services
- **Weather updates**: Real-time weather information
- **News briefings**: Latest news and updates
- **System monitoring**: Track system performance and resources

### 🤖 Agentic Automation
- **Multi-agent workflow**: Coordinated AI agents for complex tasks
- **Screen automation**: "Click the blue button", "Fill out this form"
- **Intelligent planning**: Break down complex requests into actionable steps

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shrivarshapoojari/Desktop-Agent.git
   cd Desktop-Agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root with:
   ```
   GROQ_API_KEY=your_groq_api_key_here
 ```

4. **Start the application**
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | API key for Groq AI models (vision and reasoning) |
 

 