import { Fetcher, Pair, Token } from "@crosswise/sdk";
import { ethers } from "ethers";
import fetch from "node-fetch";
import TokenEntry, { toToken } from "./types/TokenEntry";
import PancakePairAbi from "./abis/PancakePair.json";

export type OnSync = (pair: Pair) => Promise<void> | void;

const contracts: { [address: string]: ethers.Contract } = {}; // PancakePair

class Pairs {
    static watch(pair: Pair, onSync: OnSync, provider: ethers.providers.BaseProvider) {
        const { address } = pair.liquidityToken;
        let contract = contracts[address];
        if (!contract) {
            contract = new ethers.Contract(address, PancakePairAbi, provider);
            contracts[address] = contract;
        }
        contract.removeAllListeners("Sync");
        contract.on("Sync", () => onSync(pair));
    }
    
    static async fetch(provider: ethers.providers.BaseProvider) {
        const res = await fetch("https://tokens.pancakeswap.finance/pancakeswap-top-100.json");
        const resJson: any = await res.json();
        const tokens: TokenEntry[] = resJson.tokens;
        const tokenCombinations: [Token, Token][] = [];
        for (const entryA of tokens) {
            const tokenA = toToken(entryA);
            for (const entryB of tokens) {
                const tokenB = toToken(entryB);
                if (tokenA.address !== tokenB.address && tokenA.sortsBefore(tokenB)) {
                    tokenCombinations.push([tokenA, tokenB]);
                }
            }
        }
        const pairs = await Promise.all(
            tokenCombinations.map(async pair => {
                const [tokenA, tokenB] = pair;
                try {
                    return await Fetcher.fetchPairData(tokenA, tokenB, provider);
                } catch (e) {
                    return null;
                }
            })
        );
        return { tokens: tokens.map(token => toToken(token)), pairs: pairs.filter(pair => pair != null) };
    }
}

export default Pairs;
