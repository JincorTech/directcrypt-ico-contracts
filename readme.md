# Direct Crypt ICO Contracts

Baked with <3 by [secret_tech](https://secrettech.io)

## Direct Crypt Token properties (ERC20)

- Price: $1.00
- Name: Direct Crypt Token
- Ticker: DRCT
- Decimals: 18
- Automatic update of token rates every 12 hours

## Token emission

- Total supply: 500,000,000

## Private PreSale stage

- SoftCap: 1000 ETH
- HardCap: TBA ETH
- Price token: $1.00

### Bonus

- (0.1-1):          +5%  tokens
- [1-100) ETH:      +25% tokens
- [100-1000) ETH:   +50% tokens
- [1000-2000) ETH:  +60% tokens
- >=2000 ETH:       +70% tokens

## PreICO stage

- SoftCap: TBA ETH
- HardCap: TBA ETH
- Price token: TBA
- Period: TBA

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