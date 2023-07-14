import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Configuration, OpenAIApi } from "openai";

async function getTestCodeFromOpenAI(moduleName: string, sourceCode: string, apiKey: string): Promise<string> {
	const configuration = new Configuration({
			apiKey,
	});
	const openai = new OpenAIApi(configuration);
	const response = await openai.createChatCompletion({
		model: "gpt-4",
		messages: [{"role": "user", "content": `You are a TypeScript test code generator.
		Write a unit test for the following TypeScript code.
		
		# Condition.
		- Read the intent of the code and comment the description of each function at the beginning of the test function.
		- Use equivalence partitioning and boundary value analysis.
		- Use ts-jest as a testing tool.
		- Omit the explanatory text and make sure that the output is executable as TypeScript code.
		- This TypeScript code is written in a source file named '${moduleName}'
		- Place the test file on the same level as '${moduleName}'
		- Output Type: TypeScript
		
		\`\`\`TypeScript
		${sourceCode}
		\`\`\``}],
    max_tokens: 2048
	})

  return response.data.choices[0].message?.content ?? "";
}
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.generateUnitTest', async () => {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor!');
      return;
    }

    let filePath = editor.document.fileName;
    let dirName = path.dirname(filePath);
    let baseName = path.basename(filePath, path.extname(filePath));
    let testFilePath = path.join(dirName, baseName + '.test.ts');
		let sourceCode = fs.readFileSync(filePath, 'utf-8');

    let apiKey = process.env.OPENAI_API_KEY || vscode.workspace.getConfiguration('openai').get('apiKey')
    if (!apiKey) {
      vscode.window.showErrorMessage('No OpenAI API Key configured!');
      return;
    }

		let content = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating test code...',
      cancellable: false
    }, async () => {
      return getTestCodeFromOpenAI(baseName, sourceCode, apiKey ?? "");
    });

    fs.writeFileSync(testFilePath, content);

    vscode.window.showInformationMessage('Unit test file generated');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}