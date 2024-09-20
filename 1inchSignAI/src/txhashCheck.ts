import { FusionSDK, NetworkEnum } from "@1inch/fusion-sdk";

async function main() {
  const sdk = new FusionSDK({
    url: "https://api.1inch.dev/fusion",
    network: NetworkEnum.ETHEREUM,
    authKey: "9G0TupKPrRXZlfgTP3bh8IDWpmIEwvjB" 
  });

  try {
    const orders = await sdk.getOrdersByMaker({
      page: 1,
      limit: 2,
      address: "0x8Ec364d6b617eC782C28846e81e4EdE811455497"
    });

    console.log("Orders by Maker:", orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
  }
}

main();
