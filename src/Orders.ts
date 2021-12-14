import { ethers } from "ethers";
import OrderBookAbi from "./abis/OrderBook.json";
import SettlementAbi from "./abis/Settlement.json";
import Order from "./types/Order";

const LIMIT = 20;

export type OnCreateOrder = (hash: string) => Promise<void> | void;
export type OnCancelOrder = (hash: string) => Promise<void> | void;

const BLOCKS_PER_DAY = 6500;

class Orders {
    private static async fetchCanceledHashes(provider: ethers.providers.BaseProvider) {
        const fromBlock = (await provider.getBlockNumber()) - BLOCKS_PER_DAY;
        const settlement = new ethers.Contract(process.env.SETTLEMENT_ADDRESS, SettlementAbi, provider);
        const filter = settlement.filters.OrderCanceled(null);
        return (await settlement.queryFilter(filter, fromBlock)).map(event => event.args![0]);
    }

    private static async fetchHashes(testnetProvider: ethers.providers.BaseProvider) {
        const orderBook = new ethers.Contract(process.env.ORDERBOOK_ADDRESS, OrderBookAbi, testnetProvider);
        const length = (await orderBook.numberOfAllHashes()).toNumber();
        const pages: number[] = [];
        for (let i = 0; i * LIMIT < length; i++) pages.push(i);
        return (await Promise.all(pages.map(async page => await orderBook.allHashes(page, LIMIT))))
            .flat()
            .filter(hash => hash !== ethers.constants.HashZero);
    }

    static async fetch(provider: ethers.providers.BaseProvider, testnetProvider: ethers.providers.BaseProvider) {
        const settlement = new ethers.Contract(process.env.SETTLEMENT_ADDRESS, SettlementAbi, provider);
        const canceledHashes = await Orders.fetchCanceledHashes(provider);
        const hashes = await Orders.fetchHashes(testnetProvider);
        const now = Math.floor(Date.now() / 1000);
        return (
            await Promise.all(
                hashes
                    .filter(hash => !canceledHashes.includes(hash))
                    .map(async hash => {
                        const order = await this.fetchOrder(hash, testnetProvider);
                        if (order.deadline.toNumber() < now) return null;
                        const filledAmountIn = await settlement.filledAmountInOfHash(hash);
                        if (order.amountIn.eq(filledAmountIn)) return null;
                        return order;
                    })
            )
        ).filter(order => !!order);
    }

    static async fetchOrder(hash: string, testnetProvider: ethers.providers.BaseProvider) {
        const orderBook = new ethers.Contract(process.env.ORDERBOOK_ADDRESS, OrderBookAbi, testnetProvider);
        const {
            maker,
            fromToken,
            toToken,
            amountIn,
            amountOutMin,
            recipient,
            deadline,
            v,
            r,
            s
        } = await orderBook.orderOfHash(hash);
        return {
            hash,
            maker,
            fromToken,
            toToken,
            amountIn,
            amountOutMin,
            recipient,
            deadline,
            v,
            r,
            s
        } as Order;
    }

    static watch(
        onCreateOrder: OnCreateOrder,
        onCancelOrder: OnCancelOrder,
        provider: ethers.providers.BaseProvider,
        testnetProvider: ethers.providers.BaseProvider
    ) {
        const orderBook = new ethers.Contract(process.env.ORDERBOOK_ADDRESS, OrderBookAbi, testnetProvider);
        const settlement = new ethers.Contract(process.env.SETTLEMENT_ADDRESS, SettlementAbi, provider);
        orderBook.on("OrderCreated", onCreateOrder);
        settlement.on("OrderCanceled", onCancelOrder);
    }
}

export default Orders;
