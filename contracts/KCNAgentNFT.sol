// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title KCNAgentNFT
 * @notice Soulbound (non-transferable) NFT representing a buyer's KCN Vibe
 * Developer / Coder agent license. Minted once per first purchase.
 *
 * Soulbound by design: it represents "you hold a license", not a tradeable
 * asset. Transfers are blocked except mint (from == address(0)) and burn
 * (to == address(0), e.g. on a refund clawback). This keeps the NFT
 * unambiguously a product credential rather than something with resale
 * market value.
 */
contract KCNAgentNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;

    /// @notice tier name per token, e.g. "monthly", "annual", "lifetime"
    mapping(uint256 => string) public tierOf;

    event AgentMinted(address indexed buyer, uint256 indexed tokenId, string tier);

    constructor(string memory name_, string memory symbol_, address admin) ERC721(name_, symbol_) {
        require(admin != address(0), "KCNAgentNFT: admin is zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Mint one agent NFT to a buyer on first purchase.
     * @param buyer recipient wallet
     * @param tier product tier string, e.g. "1mo", "3mo", "6mo", "1yr", "lifetime"
     * @param uri metadata URI (see docs/NFT_AGENTS.md for the JSON schema)
     */
    function mintAgent(
        address buyer,
        string calldata tier,
        string calldata uri
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(buyer != address(0), "KCNAgentNFT: buyer is zero address");

        tokenId = _nextTokenId++;
        _safeMint(buyer, tokenId);
        _setTokenURI(tokenId, uri);
        tierOf[tokenId] = tier;

        emit AgentMinted(buyer, tokenId, tier);
    }

    /// @notice Burn on refund clawback. Only the minter service can call this.
    function burn(uint256 tokenId) external onlyRole(MINTER_ROLE) {
        _burn(tokenId);
    }

    // --- Soulbound enforcement -------------------------------------------

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        bool isMint = from == address(0);
        bool isBurn = to == address(0);
        require(isMint || isBurn, "KCNAgentNFT: soulbound, non-transferable");
        return super._update(to, tokenId, auth);
    }

    // --- Required overrides ------------------------------------------------

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
