import { ethers } from "ethers";

import "dotenv/config";

class Ethereum {
    provider: ethers.providers.JsonRpcProvider;
    wallet: ethers.Wallet;

    static Mainnet = new Ethereum(56, process.env.BSC_MAINNET_URL, process.env.PRIVATE_KEY);
    static Testnet = new Ethereum(97, process.env.BSC_TESTNET_URL, process.env.PRIVATE_KEY);

    private constructor(chainId: number, rpcUrl: string, privateKey: string) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
}

export default Ethereum;
