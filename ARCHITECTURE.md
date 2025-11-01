# Architecture Documentation

## System Overview

The GU Staking Protocol implements a time-weighted reward distribution system where users stake tokens and earn rewards proportional to their stake size and duration.

## Reward Calculation

### Core Formula

```
rewardPerToken = rewardPerTokenStored + ((lastTimeRewardApplicable - lastUpdateTime) * rewardRate * 1e18 / totalStaked)

earned = (stakedBalance * (rewardPerToken - userRewardPerTokenPaid) / 1e18) + rewards
```

### Variables

- `rewardRate`: Rewards distributed per second
- `rewardPerTokenStored`: Accumulated rewards per token staked
- `totalStaked`: Total amount of tokens staked in the pool
- `userRewardPerTokenPaid`: Last rewardPerToken value when user's rewards were calculated
- `rewards`: Pending rewards for user

### Update Mechanism

The `updateReward` modifier runs before every state-changing operation:

1. Calculate current `rewardPerToken`
2. Update `lastUpdateTime` to current timestamp
3. Calculate user's earned rewards
4. Update user's `userRewardPerTokenPaid`

This ensures rewards are always accurately calculated based on time elapsed and stake proportions.

## State Management

### Global State

- `totalStaked`: Sum of all user stakes
- `rewardRate`: Tokens distributed per second
- `rewardPerTokenStored`: Cumulative reward per token
- `lastUpdateTime`: Last reward calculation timestamp
- `periodFinish`: End of current reward period

### User State

- `stakedBalance[user]`: User's staked token amount
- `rewards[user]`: Pending unclaimed rewards
- `userRewardPerTokenPaid[user]`: Checkpoint for reward calculation

## Security Model

### Access Control

- Owner: Can configure reward parameters, pause/unpause
- Users: Can stake, withdraw, claim rewards

### Protection Mechanisms

1. **ReentrancyGuard**: Prevents reentrancy attacks on all external calls
2. **SafeERC20**: Protects against malicious token implementations
3. **Pausable**: Emergency stop mechanism
4. **Input Validation**: All parameters validated before state changes

### Invariants

- `totalStaked` equals sum of all `stakedBalance[user]`
- Reward calculations never overflow
- Users can only withdraw their own stake
- Reward rate matches available reward tokens

## Gas Optimization

### Storage Layout

- Immutable variables for token addresses (no SLOAD cost)
- Packed storage where possible
- Minimal state updates per transaction

### Calculation Efficiency

- Rewards calculated on-demand, not stored per user
- Single storage update per user interaction
- Batch operations (exit = withdraw + claim)

## Upgrade Path

Current implementation is non-upgradeable. For production with upgradeability:

1. Implement proxy pattern (UUPS or Transparent)
2. Add storage gaps for future variables
3. Include upgrade authorization logic
4. Maintain storage layout compatibility

## Integration Points

### Frontend Integration

```javascript
// Read operations (no gas)
const earned = await stakingPool.earned(address);
const staked = await stakingPool.stakedBalance(address);
const totalStaked = await stakingPool.totalStaked();

// Write operations (requires gas)
await stakingPool.stake(amount);
await stakingPool.claimReward();
await stakingPool.exit();
```

### Backend Monitoring

Monitor events for indexing:
- `Staked(address user, uint256 amount)`
- `Withdrawn(address user, uint256 amount)`
- `RewardPaid(address user, uint256 reward)`
- `RewardAdded(uint256 reward)`

## Testing Strategy

### Unit Tests

- Individual function behavior
- Edge cases and boundary conditions
- Access control enforcement
- Event emission

### Integration Tests

- Multi-user scenarios
- Time-based reward distribution
- Full user lifecycle (stake → earn → claim → withdraw)

### Invariant Tests

- Total staked consistency
- Reward calculation accuracy
- No reward loss or creation

## Deployment Checklist

1. Deploy StakingToken
2. Deploy RewardToken
3. Deploy StakingPool with token addresses
4. Transfer reward tokens to StakingPool
5. Call `notifyRewardAmount` to start distribution
6. Verify contracts on block explorer
7. Test with small amounts
8. Monitor for 24-48 hours before announcing
