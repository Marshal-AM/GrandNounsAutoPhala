import 'dotenv/config';
import './testSupport';
import { execute } from "./testSupport";
import * as readline from 'readline';

async function test() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'You: '
    });

    console.log("Start chatting with the assistant (type 'exit' to quit):");
    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        if (input.toLowerCase() === 'exit') {
            rl.close();
            return;
        }

        try {
            const getResult = await execute({
                method: 'GET',
                path: '/ipfs/CID',
                queries: {
                    chatQuery: [input],   
                    model: ["gpt-4o"]     
                },
                secret: { apiKey: 'sk-qVBlJkO3e99t81623PsB0zHookSQJxU360gDMooLenN01gv2' },
                headers: {},
            });

            // Try parsing and logging the entire result for debugging
            const parsedResult = JSON.parse(getResult);
            console.log('Full API response:', parsedResult);

            // Debugging - log the choices and message structure
            if (parsedResult && parsedResult.choices) {
                console.log('Choices:', parsedResult.choices);
            } else {
                console.log('No choices in response');
            }

            // Extract and log assistant message
            const assistantMessage = parsedResult?.choices?.[0]?.message?.content || "No response from assistant";
            console.log(`Assistant: ${assistantMessage}`);

        } catch (err) {
            console.error('Error:', err);
        }

        rl.prompt();
    }).on('close', () => {
        console.log('Goodbye!');
        process.exit(0);
    });
}

test();
