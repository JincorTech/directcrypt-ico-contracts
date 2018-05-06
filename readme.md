# MyPizzaPie ICO Contracts

Baked with <3 by [secret_tech](https://secrettech.io)

## MyPizzaPie token properties (ERC20)

- Price: $1.00
- Name: MyPizzaPie Token
- Ticker: PZA
- Decimals: 18
- Automatic update of token rates every 12 hours

## Token emission

- Total supply: 81,192,000
- Sales pool is 28,892,000 (PreSale, Pre-ICO and ICO)

## Private PreSale stage

- SoftCap: 500 ETH
- HardCap: 28,500 ETH
- Price token: $1.00

### Bonus

- 50-99 ETH: +30% tokens
- 100-499 ETH: +40% tokes
- 500-1000 ETH: +50% tokens

## PreICO stage

- SoftCap: 2,500 ETH
- HardCap: 28,500 ETH
- Price token: $0.75 (discount 25%)
- Period: 7 days

## ICO stage

- SoftCap: 2,500 ETH
- HardCap: 28,500 ETH

### Bonus

- 1-9 days: +20%
- 10-19 days: +15%
- 20-29 days: +10%
- 30-39 days: +5%

## Referral program
- Referral program bonus shall run in pre-ico and ico only
- Referral program (bonus) shall be set at: 5% to referrer

## How to setup development environment and run tests?

1. Install `docker` if you don't have it.
1. Clone this repo.
1. Run `docker-compose build --no-cache`.
1. Run `docker-compose up -d`. 
You should wait a bit until Oraclize ethereum-bridge initialize. Wait for 
`Please add this line to your contract constructor:
OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);`
message to appear. To check for it run `docker logs ico_oracle_1`.
1. Install dependencies: `docker-compose exec workspace yarn`.
1. To run tests: `docker-compose exec workspace truffle test`.
1. To merge your contracts via sol-merger run: `docker-compose exec workspace yarn merge`.
Merged contracts will appear in `merge` directory.
1. To compile your contracts: `docker-compose exec workspace truffle compile`.
Compiled contracts will appear in `build` directory. In this directory, there will be files in which all necessary information will be provided (abi, bytecode, compiler and etc).