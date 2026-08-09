// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title KCNToken (Ketchum Cognitive Network)
 * @notice Utility token for the KCN Vibe Developer / Coder product.
 *
 * Minting is restricted to addresses holding MINTER_ROLE — in production
 * that's the backend service wallet that listens for confirmed Stripe
 * payments (see server/mint/firstPurchaseMint.js). There is no public
 * mint function; tokens only ever enter circulation through that
 * server-triggered, payment-gated path.
 *
 * "Reverse mint": every first-purchase mint call mints two amounts in the
 * same transaction — one to the buyer, one to the creator address — so
 * the creator's share is transparent on-chain rather than a hidden fee.
 */
contract KCNToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Hard cap on total supply. Adjust before deploying to mainnet.
    uint256 public immutable maxSupply;

    event ReverseMint(address indexed buyer, address indexed creator, uint256 buyerAmount, uint256 creatorAmount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address admin
    ) ERC20(name_, symbol_) {
        require(admin != address(0), "KCNToken: admin is zero address");
        maxSupply = maxSupply_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Mint to a buyer and simultaneously reverse-mint to the creator.
     * @dev Only callable by MINTER_ROLE (the backend mint service). Enforces
     *      the supply cap across both amounts combined.
     */
    function mintWithReverse(
        address buyer,
        address creator,
        uint256 buyerAmount,
        uint256 creatorAmount
    ) external onlyRole(MINTER_ROLE) {
        require(buyer != address(0), "KCNToken: buyer is zero address");
        require(creator != address(0), "KCNToken: creator is zero address");
        require(totalSupply() + buyerAmount + creatorAmount <= maxSupply, "KCNToken: exceeds max supply");

        _mint(buyer, buyerAmount);
        _mint(creator, creatorAmount);

        emit ReverseMint(buyer, creator, buyerAmount, creatorAmount);
    }

    /**
     * @notice Burn caller's own tokens. Used for the "reverse-token" refund
     *         path — see docs/ECONOMY.md for when the backend calls this.
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Burn from an approved account (e.g. backend-executed refund clawback).
    function burnFrom(address account, uint256 amount) external onlyRole(MINTER_ROLE) {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }
}
