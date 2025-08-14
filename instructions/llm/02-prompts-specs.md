# **LLM Prompts and Specifications (Node.js/TypeScript)**

This document details the specific prompts and instructions for each node in the LangGraph.js workflow. These are the core "rules" that the LLM will follow.

## **1\. Node: extractStatements**

**Purpose:** To deconstruct a user's proposal into a list of clear, distinct impact statements.  
**Prompt Specification:**

* **Role:** You are an expert analyst with a talent for deconstructing complex ideas into simple, atomic statements.  
* **Task:** Take the user's proposal and identify all of its concrete components. Each component should be rephrased as a single, unambiguous statement of impact or action.  
* **Output Format:** A JSON array of strings, where each string is an impact statement. Do not include any other text in your response.

Example (Few-Shot):  
Input: proposal: "We should build a fleet of electric driverless vehicles for our city and replace trains to provide efficient transport for remote areas"  
Output: \["Build a fleet of electric driverless vehicles", "Replace existing trains", "Provide efficient transport for remote areas"\]

## **2\. Node: generateDownstreamImpacts**

**Purpose:** To brainstorm a wide range of secondary and tertiary impacts for a single, primary statement.  
**Prompt Specification:**

* **Role:** You are a systems thinking expert. You understand how a single action can ripple through an ecosystem.  
* **Task:** Given a single impactStatement (a string), generate a list of 5-10 direct and indirect downstream consequences. Think broadly about resources, labor, environment, social effects, and economic factors.  
* **Output Format:** A JSON array of strings, where each string is a downstream impact.

## **3\. Node: categorizeImpacts**

**Purpose:** To logically group all impact statements into meaningful categories for analysis.  
**Prompt Specification:**

* **Role:** You are an expert categorizer and organizer.  
* **Task:** Take a list of impactStatements (an array of strings) and group them into logical categories. The categories should be high-level and relevant to a sustainability analysis (e.g., "Resource Impact", "Labor & Social", "Environmental", "Economic", "Governance"). The output should be a structured JSON object.  
* **Output Format:** A JSON object where keys are the category names (strings) and values are arrays of the relevant impact statements (strings).

## **4\. Node: researchAndEvaluate**

**Purpose:** To find data and assign a quantifiable score to each category.  
**Prompt Specification:**

* **Role:** You are a meticulous researcher and an impartial judge. Your judgment is based on the principles of Doughnut Economics and the UN's Sustainable Development Goals (SDGs).  
* **Sub-Task 1 (Research):** Given an impactCategory and its statements (an array of strings), use a search tool to find concrete, numerical data. For example, for "Resource Impact", search for "global lithium production 2024", "cadmium resource depletion rate", etc.  
* **Sub-Task 2 (Evaluation):** Analyze the research findings. Assign a numerical score between \-1.0 (highly negative) and \+1.0 (highly positive) to the category. A score of 0.0 is neutral.  
  * **Scoring Criteria:**  
    * **Positive Score:** The impact measurably improves a social or environmental metric (e.g., improves a key SDG, fills a social foundation gap in Doughnut Economics).  
    * **Negative Score:** The impact depletes a critical resource, harms a social foundation, or negatively affects an SDG.  
    * The magnitude of the score should be proportional to the magnitude of the impact. A small, negligible effect is closer to 0.0, while a global, systemic effect is closer to \-1.0 or \+1.0.  
* **Output Format:** A JSON object containing two keys: "researchSummary" (a string of findings) and "score" (a float).

## **5\. Node: summarizeFindings**

**Purpose:** To present a final, actionable summary to the user.  
**Prompt Specification:**

* **Role:** You are a senior analyst and advisor. Your goal is to provide a clear, concise, and professional summary.  
* **Task:** Combine the original proposal, the evaluatedScores, and the researchFindings to generate a final summary and recommendation.  
* **Summary Structure:**  
  1. A brief, one-sentence overview of the proposal's overall impact.  
  2. A point-by-point breakdown of each category's score and the justification from the research.  
  3. A final, explicit recommendation.  
* **Recommendation Logic:** The system has a hard rule: a negative impact is only considered "acceptable" if the total positive score is at least 10 times the absolute value of the total negative score. If this condition is not met, the recommendation is to **not** proceed with the proposal as-is.  
* **Output Format:** A well-formatted Markdown string suitable for direct display in the web application's UI.

## **6\. Real Cost Tracking & Cost Optimization**

### **6.1. Token Usage Monitoring**
Each prompt should be designed to minimize token consumption while maintaining quality:
- Use concise, clear instructions
- Limit examples to essential few-shot cases
- Structure prompts for efficient parsing
- Monitor token usage through Langfuse for real-time cost calculation

### **6.2. Cost-Effective Prompt Design**
- **extractStatements:** Target: 200-300 tokens (~$0.004-0.006)
- **generateDownstreamImpacts:** Target: 150-250 tokens per statement (~$0.003-0.005 per statement)
- **categorizeImpacts:** Target: 200-300 tokens (~$0.004-0.006)
- **researchAndEvaluate:** Target: 300-400 tokens per category (~$0.006-0.008 per category)
- **summarizeFindings:** Target: 400-500 tokens (~$0.008-0.010)

### **6.3. Real-Time Cost Calculation**
Track the following metrics per analysis for accurate billing:
- **Input Tokens:** Count for each prompt
- **Output Tokens:** Count for each completion
- **Total Cost:** Real-time calculation based on provider rates
- **Analysis Duration:** Time per analysis for performance monitoring
- **Success Rate:** Track failed vs. successful analyses
- **User Balance Impact:** Show cost impact on user's remaining balance

### **6.4. Cost Transparency**
- **Pre-Analysis:** Show estimated cost based on proposal length and complexity
- **Post-Analysis:** Display actual cost and update user balance
- **Cost Breakdown:** Show cost per analysis step for transparency
- **Balance Warnings:** Alert users when balance gets low (<$0.50)