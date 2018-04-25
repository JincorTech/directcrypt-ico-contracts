pragma solidity ^0.4.11;

import "./Haltable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./MyPizzaPieToken.sol";
import "./InvestorWhiteList.sol";
import "./abstract/PriceReceiver.sol";


contract MyPizzaPieTokenPreSale is Haltable, PriceReceiver {
  using SafeMath for uint;

  string public constant name = "MyPizzaPie Token PreSale";

  MyPizzaPieToken public token;
  InvestorWhiteList public investorWhiteList;

  address public beneficiary;

  uint public hardCap;
  uint public softCap;

  uint public ethUsdRate;
  uint public btcUsdRate;

  uint public tokenMinimalPurchase;
  uint public tokenPriceUsd;
  uint public totalTokens;//in wei

  uint public collected = 0;
  uint public tokensSold = 0;
  uint public investorCount = 0;
  uint public weiRefunded = 0;

  uint public startBlock;
  uint public endBlock;

  bool public softCapReached = false;
  bool public crowdsaleFinished = false;

  mapping (address => bool) refunded;
  mapping (address => uint) public deposited;

  event SoftCapReached(uint softCap);
  event NewContribution(address indexed holder, uint tokenAmount, uint etherAmount);
  event Refunded(address indexed holder, uint amount);
  event Deposited(address indexed holder, uint amount);
  event Amount(uint amount);

  modifier preSaleActive() {
    require(block.number >= startBlock && block.number < endBlock);
    _;
  }

  modifier preSaleEnded() {
    require(block.number >= endBlock);
    _;
  }

  modifier minInvestment() {
     require(msg.value >= getOneTokenInWei() * tokenMinimalPurchase);
    _;
  }

  modifier inWhiteList() {
    require(investorWhiteList.isAllowed(msg.sender));
    _;
  }

  function MyPizzaPieTokenPreSale(
    uint _hardCapETH,
    uint _softCapETH,

    address _token,
    address _beneficiary,
    address _investorWhiteList,

    uint _totalTokens,
    uint _tokenMinimalPurchase,
    uint _tokenPriceUsd,

    uint _baseEthUsdPrice,
    uint _baseBtcUsdPrice,

    uint _startBlock,
    uint _endBlock
  ) {
    ethUsdRate = _baseEthUsdPrice;
    btcUsdRate = _baseBtcUsdPrice;
    tokenPriceUsd = _tokenPriceUsd;

    tokenMinimalPurchase = _tokenMinimalPurchase;
    totalTokens = _totalTokens.mul(1 ether);

    hardCap = _hardCapETH.mul(1 ether);
    softCap = _softCapETH.mul(1 ether);

    token = MyPizzaPieToken(_token);
    investorWhiteList = InvestorWhiteList(_investorWhiteList);
    beneficiary = _beneficiary;

    startBlock = _startBlock;
    endBlock = _endBlock;
  }

  function() payable minInvestment inWhiteList {
    doPurchase(msg.sender);
  }

  function refund() external preSaleEnded inNormalState {
    require(softCapReached == false);
    require(refunded[msg.sender] == false);

    uint refund = deposited[msg.sender];
    require(refund > 0);

    msg.sender.transfer(refund);
    deposited[msg.sender] = 0;
    refunded[msg.sender] = true;
    weiRefunded = weiRefunded.add(refund);
    Refunded(msg.sender, refund);
  }

  function withdraw() external onlyOwner {
    require(softCapReached);
    beneficiary.transfer(collected);
    token.transfer(beneficiary, token.balanceOf(this));
    crowdsaleFinished = true;
  }

  function receiveEthPrice(uint ethUsdPrice) external onlyEthPriceProvider {
    require(ethUsdPrice > 0);
    ethUsdRate = ethUsdPrice;
  }

  function receiveBtcPrice(uint btcUsdPrice) external onlyBtcPriceProvider {
    require(btcUsdPrice > 0);
    btcUsdRate = btcUsdPrice;
  }

  function setEthPriceProvider(address provider) external onlyOwner {
    require(provider != 0x0);
    ethPriceProvider = provider;
  }

  function setBtcPriceProvider(address provider) external onlyOwner {
    require(provider != 0x0);
    btcPriceProvider = provider;
  }

  function setNewWhiteList(address newWhiteList) external onlyOwner {
    require(newWhiteList != 0x0);
    investorWhiteList = InvestorWhiteList(newWhiteList);
  }

  function doPurchase(address _owner) private preSaleActive inNormalState {
    require(!crowdsaleFinished);
    require(collected.add(msg.value) <= hardCap);
    require(totalTokens >= tokensSold + msg.value.div(getOneTokenInWei()));

    if (!softCapReached && collected < softCap && collected.add(msg.value) >= softCap) {
      softCapReached = true;
      SoftCapReached(softCap);
    }

    uint tokens = msg.value.div(getOneTokenInWei());

    if (token.balanceOf(msg.sender) == 0) investorCount++;

    collected = collected.add(msg.value);

    token.transfer(msg.sender, tokens.mul(1 ether));

    tokensSold = tokensSold.add(tokens.mul(1 ether));
    deposited[msg.sender] = deposited[msg.sender].add(msg.value);
    
    NewContribution(_owner, tokens, msg.value);
  }

  function getOneTokenInWei() private returns (uint) {
    return tokenPriceUsd.mul(1 ether).div(ethUsdRate);
  }
}
