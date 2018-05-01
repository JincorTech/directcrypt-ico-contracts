pragma solidity ^0.4.11;

import "./Haltable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./MyPizzaPieToken.sol";
import "./InvestorWhiteList.sol";
import "./abstract/PriceReceiver.sol";

contract MyPizzaPieTokenICO is Haltable, PriceReceiver {
  using SafeMath for uint;

  string public constant name = "MyPizzaPie Token ICO";

  MyPizzaPieToken public token;

  address public beneficiary;

  address public constant preSaleAddress = 0x949C9B8dFf9b264CAD57F69Cd98ECa1338F05B39;

  InvestorWhiteList public investorWhiteList;

  uint public constant pzaUsdRate = 100; //in cents

  uint public ethUsdRate;
  uint public btcUsdRate;

  uint public hardCap;
  uint public softCap;

  uint public collected = 0;
  uint public tokensSold = 0;
  uint public weiRefunded = 0;

  uint public startTime;
  uint public endTime;

  bool public softCapReached = false;
  bool public crowdsaleFinished = false;

  uint public endOfFirstDecade;
  uint public endOfSecondDecade;
  uint public endOfThirdDecade;
  uint public endOfFourthDecade;

  mapping (address => uint) public deposited;

  event SoftCapReached(uint softCap);
  event NewContribution(address indexed holder, uint tokenAmount, uint etherAmount);
  event NewReferralTransfer(address indexed investor, address indexed referral, uint tokenAmount);
  event Refunded(address indexed holder, uint amount);

  modifier icoActive() {
    require(block.timestamp >= startTime && block.timestamp < endTime);
    _;
  }

  modifier icoEnded() {
    require(block.timestamp >= endTime);
    _;
  }

  modifier minInvestment() {
    require(msg.value >= 0.1 * 1 ether);
    _;
  }

  modifier inWhiteList() {
    require(investorWhiteList.isAllowed(msg.sender));
    _;
  }

  function MyPizzaPieTokenICO(
    uint _hardCapETH,
    uint _softCapETH,

    address _token,
    address _beneficiary,
    address _investorWhiteList,

    uint _baseEthUsdPrice,
    uint _baseBtcUsdPrice,

    uint _startTime,
    uint _endOfFirstDecade,
    uint _endOfSecondDecade,
    uint _endOfThirdDecade,
    uint _endTime
  ) {
    hardCap = _hardCapETH.mul(1 ether);
    softCap = _softCapETH.mul(1 ether);

    token = MyPizzaPieToken(_token);
    beneficiary = _beneficiary;
    investorWhiteList = InvestorWhiteList(_investorWhiteList);

    startTime = _startTime;
    endOfFirstDecade = _endOfFirstDecade;
    endOfSecondDecade = _endOfSecondDecade;
    endOfThirdDecade = _endOfThirdDecade;
    endOfFourthDecade = _endTime;
    endTime = _endTime;

    ethUsdRate = _baseEthUsdPrice;
    btcUsdRate = _baseBtcUsdPrice;
  }

  function() payable minInvestment inWhiteList {
    doPurchase();
  }

  function refund() external icoEnded {
    require(softCapReached == false);
    require(deposited[msg.sender] > 0);

    uint refund = deposited[msg.sender];

    deposited[msg.sender] = 0;
    msg.sender.transfer(refund);

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

  function transferOwnership(address newOwner) onlyOwner icoEnded {
    super.transferOwnership(newOwner);
  }

  function doPurchase() private icoActive inNormalState {
    require(!crowdsaleFinished);

    uint tokens = msg.value.mul(ethUsdRate).div(pzaUsdRate);
    tokens = tokens.add(calculateBonus(tokens));

    uint newTokensSold = tokensSold.add(tokens);

    uint referralBonus = calculateReferralBonus(tokens);
    address referral = investorWhiteList.getReferralOf(msg.sender);

    if (referralBonus > 0 && referral != 0x0) {
      newTokensSold = newTokensSold.add(referralBonus);
    }

    require(collected.add(msg.value) <= hardCap);

    if (!softCapReached
      && collected < softCap
      && collected.add(msg.value) >= softCap
    ) {
      softCapReached = true;
      SoftCapReached(softCap);
    }

    collected = collected.add(msg.value);

    tokensSold = newTokensSold;

    deposited[msg.sender] = deposited[msg.sender].add(msg.value);

    token.transfer(msg.sender, tokens);
    NewContribution(msg.sender, tokens, msg.value);

    if (referralBonus > 0 && referral != 0x0) {
      token.transfer(referral, referralBonus);
      NewReferralTransfer(msg.sender, referral, referralBonus);
    }
  }

  function calculateReferralBonus(uint tokens) private returns(uint bonus) {
    return tokens.mul(5).div(100);
  }

  function calculateBonus(uint tokens) internal constant returns (uint bonus) {
    if (block.timestamp >= startTime && block.timestamp < endOfFirstDecade) {
      return tokens.mul(20).div(100);
    } else if (block.timestamp >= endOfFirstDecade && block.timestamp < endOfSecondDecade) {
      return tokens.mul(15).div(100);
    } else if (block.timestamp >= endOfSecondDecade && block.timestamp < endOfThirdDecade) {
      return tokens.mul(10).div(100);
    } else if (block.timestamp >= endOfThirdDecade && block.timestamp < endOfFourthDecade) {
      return tokens.mul(5).div(100);
    }
  }
}
