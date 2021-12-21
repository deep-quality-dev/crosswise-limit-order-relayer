import {Fetcher, Pair, Token} from '@crosswise/sdk'
import axios from 'axios'
import {ethers} from 'ethers'
import TokenEntry, {toToken} from './types/TokenEntry'
import PancakePairAbi from './abis/PancakePair.json'

export type OnSync = (pair: Pair) => Promise<void> | void

const contracts: {[address: string]: ethers.Contract} = {} // PancakePair

class Pairs {
  static watch(
    pair: Pair,
    onSync: OnSync,
    provider: ethers.providers.BaseProvider
  ) {
    const {address} = pair.liquidityToken
    let contract = contracts[address]
    if (!contract) {
      contract = new ethers.Contract(address, PancakePairAbi, provider)
      contracts[address] = contract
    }
    contract.removeAllListeners('Sync')
    contract.on('Sync', () => onSync(pair))
  }

  static async fetch(provider: ethers.providers.BaseProvider) {
    // const res = await axios.get(
    //   'https://tokens.pancakeswap.finance/pancakeswap-top-100.json'
    // )
    // const resJson: any = await res.data
    // const tokens: TokenEntry[] = resJson.tokens

    const tokens: TokenEntry[] = [
      {
        chainId: 97,
        address: '0xbD3079d92db300E4574692F5e4Fc5911a54B8057',
        decimals: 18,
        symbol: 'CRSS',
        name: 'CRSS',
        blockNumber: 0,
      },
      {
        chainId: 97,
        address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
        decimals: 18,
        symbol: 'BNB',
        name: 'BNB',
        blockNumber: 0,
      },
      {
        chainId: 56,
        address: '0x0999ba9aEA33DcA5B615fFc9F8f88D260eAB74F1',
        decimals: 18,
        symbol: 'CRSS',
        name: 'CRSS',
        blockNumber: 0,
      },
      {
        chainId: 56,
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        decimals: 18,
        symbol: 'BNB',
        name: 'BNB',
        blockNumber: 0,
      },
    ]

    const tokenCombinations: [Token, Token][] = []
    for (const entryA of tokens) {
      const tokenA = toToken(entryA)
      for (const entryB of tokens) {
        const tokenB = toToken(entryB)
        if (tokenA.address !== tokenB.address && tokenA.sortsBefore(tokenB)) {
          tokenCombinations.push([tokenA, tokenB])
        }
      }
    }
    const pairs = await Promise.all(
      tokenCombinations.map(async (pair) => {
        const [tokenA, tokenB] = pair
        try {
          return await Fetcher.fetchPairData(tokenA, tokenB, provider)
        } catch (e) {
          return null
        }
      })
    )
    return {
      tokens: tokens.map((token) => toToken(token)),
      pairs: pairs.filter((pair) => pair != null),
    }
  }
}

export default Pairs
