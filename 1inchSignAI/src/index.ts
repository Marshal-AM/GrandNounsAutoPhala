import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { Request, Response, route } from './httpSupport';
import { FusionSDK, NetworkEnum } from "@1inch/fusion-sdk";

// Your private key
const privateKey: `0x${string}` = "0xa5af5ad48587f7afd9d5346cb128dcc29e63eee089015111f45f00f45c545771";
const client = new SignProtocolClient(SpMode.OnChain, {
  chain: EvmChains.gnosisChiado,
  account: privateKeyToAccount(privateKey),
});

const chatHistories: { [sessionId: string]: { role: string, content: string }[] } = {};

interface SchemaResult {
  schemaId: string;
  txHash?: string;
}

interface AttestationResult {
  attestationId: string;
  txHash?: string;
  indexingValue?: string;
}

// Create schema function
async function createSchema(): Promise<SchemaResult> {
  try {
    const res = await client.createSchema({
      name: "SDK Test",
      data: [
        { name: "response", type: "string" },
      ],
    });
    console.log("Schema created:", res);
    return {
      schemaId: res.schemaId,
      txHash: res.txHash || 'Transaction hash not available'
    };
  } catch (error) {
    console.error("Error creating schema:", error);
    throw error;
  }
}

// Create attestation function
async function createNotaryAttestation(schemaId: string, contractDetails: string, signer: string): Promise<AttestationResult> {
  try {
    const formattedSigner: `0x${string}` = signer as `0x${string}`;

    const res = await client.createAttestation({
      schemaId: schemaId,
      data: {
        response: contractDetails,
      },
      indexingValue: formattedSigner.toLowerCase(),
    });

    console.log("Attestation created:", res);
    return {
      attestationId: res.attestationId,
      txHash: res.txHash || 'Transaction hash not available',
      indexingValue: res.indexingValue || 'Indexing value not available'
    };
  } catch (error) {
    console.error("Error creating attestation:", error);
    throw error;
  }
}

// Modified run function to only execute if "Approved" is present
async function run(address: string, isApproved: boolean): Promise<{ schema?: SchemaResult, attestation?: AttestationResult }> {
  if (!isApproved) {
    // Return empty values if not approved
    return { schema: undefined, attestation: undefined };
  }
  try {
    const schema = await createSchema();
    const attestation = await createNotaryAttestation(schema.schemaId, "Example response string", address);
    return { schema, attestation };
  } catch (error) {
    console.error("Error in run function:", error);
    throw error;
  }
}

// GET function (modified to check if response contains "Approved")
async function GET(req: Request): Promise<Response> {
  const secrets = req.secret || {};
  const queries = req.queries;
  const apiKey = secrets.apiKey || 'sk-nypg8jmdw5GgFVRN3MzHGmMhBxxSXpQiwy4wGqVBEa1vL79W';

  const model = queries.model ? queries.model[0] : 'gpt-4o';
  const chatQuery = queries.chatQuery ? queries.chatQuery[0] : 'Who are you?';
  const sessionId = queries.sessionId ? queries.sessionId[0] : 'default';
  
  const address = queries.address ? queries.address[0] : null;
  if (!address) {
    return new Response(JSON.stringify({ error: 'Address is required' }), { status: 400 });
  }

  let result: any = {};

  if (!chatHistories[sessionId]) {
    chatHistories[sessionId] = [
      {
        role: "system",
        content: `1.)IMPORTANT: You will receive a JSON response. Your job is to ANALYZE THE DATA and check whether maker asset is 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 and the maker amount is 3010882586
                  EXAMPLE: Here is an example of how your input will look:
                  Orders by Maker: {
  meta: { totalItems: 2, currentPage: 1, itemsPerPage: 1, totalPages: 2 },
  items: [
    {
      orderHash: '0xfaa5c9e8cc7f1e1da650c1d1055205e5ff0e6cd248c65fb845f02c7d6b7d4778',
      makerAsset: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      takerAsset: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      makerAmount: '3010882586',
      minTakerAmount: '1240488962017769884',
      createdAt: '2024-09-13T18:23:53.977Z',
      fills: [Array],
      approximateTakingAmount: '1246501363918877611',
      status: 'filled',
      cancelTx: null,
      isNativeCurrency: true,
      auctionStartDate: 1726251855,
      auctionDuration: 180,
      initialRateBump: 57322,
      points: null
    }
  ]
}.
                 
                  3.)Note: If the maker asset is 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 and the maker amount is 3010882586, you simply have to say Approved followed by a congratulations statement saying "You made a successful transaction".
                4.)Note: If the maker asset is not 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 or when the maker amount is not 3010882586 when you checked, you have to say Disapproved followed by explaining where the transaction went wrong to the user
                5.)NEVER EVER CHANGE THIS FORMAT AT ALL!!!!
                6.)NEVER EVER RESPOND in a different way. Just do what you're supposed to do!!!.`
      }
    ];
  }

  let fusionResult = '';
  try {
    const sdk = new FusionSDK({
      url: "https://api.1inch.dev/fusion",
      network: NetworkEnum.ETHEREUM,
      authKey: "9G0TupKPrRXZlfgTP3bh8IDWpmIEwvjB"
    });

    const orders = await sdk.getOrdersByMaker({
      page: 1,
      limit: 1,
      address: address
    });

    fusionResult = JSON.stringify(orders, null, 2);
  } catch (error) {
    console.error("Error fetching orders:", error);
    result.message = "Error fetching orders from 1inch API.";
    return new Response(JSON.stringify(result));
  }

  chatHistories[sessionId].push({
    role: "user",
    content: `Fusion SDK Response: ${fusionResult}`
  });

  chatHistories[sessionId].push({
    role: "user",
    content: chatQuery
  });

  try {
    const response = await fetch('https://api.red-pill.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: chatHistories[sessionId],
        model: model,
        n: 1,
        temperature: 1,
        max_tokens: 500
      })
    });

    const responseData = await response.json();

    const messageContent = responseData.choices[0].message?.content;
    const isApproved = messageContent && messageContent.includes("Approved");

    if (messageContent) {
      chatHistories[sessionId].push({
        role: "assistant",
        content: messageContent
      });

      result.message = messageContent;

      if (chatHistories[sessionId].length > 11) {
        chatHistories[sessionId] = [
          chatHistories[sessionId][0],
          ...chatHistories[sessionId].slice(-10)
        ];
      }

      // Run schema and attestation only if "Approved" is present
      const { schema, attestation } = await run(address, isApproved);

      // Add schema and attestation info to the result if approved
      result.schema = schema || {};
      result.attestation = attestation || {};

    } else if (responseData.error) {
      result.message = responseData.error.message || "An error occurred";
    } else {
      result.message = "Unexpected response format";
    }
  } catch (error) {
    console.error('Error:', error);
    result.message = "An error occurred while processing the request";
  }

  return new Response(JSON.stringify(result));
}

// POST function (not implemented yet)
async function POST(req: Request): Promise<Response> {
  return new Response(JSON.stringify({ message: 'POST Not Implemented' }));
}

// OPTIONS function
async function OPTIONS(req: Request): Promise<Response> {
  return new Response(JSON.stringify({ message: 'OPTIONS' }));
}

// Main function to route requests
export default async function main(request: string) {
  return await route({ GET, POST, OPTIONS }, request);
}
