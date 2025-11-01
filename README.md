# GU Staking Protocol

Production-grade staking protocol with time-based reward distribution for EVM-compatible blockchains.

## Architecture

### Core Contracts

- **StakingToken (STK)**: ERC20 token used for staking
- **RewardToken (RWD)**: ERC20 token distributed as rewards
- **StakingPool**: Main staking contract with reward distribution logic

### Features

- Time-weighted reward distribution
- Proportional rewards based on stake size
- Configurable reward periods
- Emergency pause functionality
- Non-custodial design
- Gas-optimized operations

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `PRIVATE_KEY`: Deployment wallet private key
- `ALCHEMY_API_KEY`: Alchemy RPC endpoint key
- `ETHERSCAN_API_KEY`: For contract verification

## Build

```bash
npm run compile
```

## Testing

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Generate coverage report
npm run test:coverage
```

## Deployment

### Local Network

```bash
# Start local node
npm run node

# Deploy (in another terminal)
npm run deploy:local
```

### Testnet (Sepolia)

```bash
npm run deploy:sepolia
npm run verify:sepolia
```

### Mainnet

```bash
npm run deploy:mainnet
npm run verify:mainnet
```

## Usage

### Staking Flow

1. Approve StakingPool to spend StakingToken
2. Call `stake(amount)` to deposit tokens
3. Rewards accumulate over time based on reward rate
4. Call `claimReward()` to collect rewards
5. Call `withdraw(amount)` to unstake tokens
6. Or call `exit()` to withdraw and claim in one transaction

### Contract Interaction

```javascript
// Approve staking
await stakingToken.approve(stakingPoolAddress, amount);

// Stake tokens
await stakingPool.stake(ethers.parseEther("100"));

// Check earned rewards
const earned = await stakingPool.earned(userAddress);

// Claim rewards
await stakingPool.claimReward();

// Withdraw stake
await stakingPool.withdraw(ethers.parseEther("100"));

// Exit (withdraw + claim)
await stakingPool.exit();
```

### Admin Operations

```javascript
// Set reward amount for period
await stakingPool.notifyRewardAmount(ethers.parseEther("100000"));

// Update reward duration (only after period ends)
await stakingPool.setRewardsDuration(60 * 86400); // 60 days

// Pause staking
await stakingPool.pause();

// Unpause staking
await stakingPool.unpause();
```

## Contract Addresses

Deployment addresses are saved in `deployments/` directory after each deployment.

## Security Considerations

- All external calls use OpenZeppelin's SafeERC20
- ReentrancyGuard on all state-changing functions
- Pausable for emergency situations
- Owner-only admin functions
- No proxy pattern - immutable deployment

## Gas Optimization

- Minimal storage reads/writes
- Efficient reward calculation algorithm
- Batch operations where possible
- Optimized compiler settings (200 runs)

## License

MIT
