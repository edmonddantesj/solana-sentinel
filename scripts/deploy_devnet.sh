#!/bin/bash
echo "🚀 [Blue-Gear] Starting Solana Devnet Deployment..."
# Check for solana cli
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it."
    exit 1
fi

# Set config to devnet
solana config set --url devnet

# Build anchor project
echo "🛠️ Building Anchor project..."
anchor build

# Deploy
echo "🚢 Deploying to Devnet..."
anchor deploy
