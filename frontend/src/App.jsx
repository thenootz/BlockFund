import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Coins,
  Users,
  ShieldCheck,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
} from "lucide-react";

/**
 * NOTE: To resolve the dependency error in this environment,
 * we use the global 'ethers' object provided by the CDN script
 * typically loaded in the HTML head.
 */

// --- CONFIGURATION & ABIs ---
const CONTRACT_ADDRESSES = {
  FixedPriceToken: "0x0000000000000000000000000000000000000001",
  CrowdFunding: "0x0000000000000000000000000000000000000002",
  SponsorFunding: "0x0000000000000000000000000000000000000003",
  DistributeFunding: "0x0000000000000000000000000000000000000004",
  OwnerAddress: "0xYourOwnerAddressHere",
};

const ERC20_ABI = [
  "function buyTokens(uint256 amount) payable",
  "function tokenPriceWei() public view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

const CROWDFUNDING_ABI = [
  "function fundingGoal() view returns (uint256)",
  "function totalCollected() view returns (uint256)",
  "function fundingState() view returns (string)",
  "function contribute(uint256 amount) public",
  "function withdraw(uint256 amount) public",
  "function finalizeAndRequestSponsorship() public",
  "function transferToDistribute() public",
];

const SPONSOR_ABI = [
  "function setAllowedCrowdFunding(address target, bool allowed) public",
  "function buyTokensForSponsorship(uint256 amount) payable",
];

const DISTRIBUTE_ABI = [
  "function addOrUpdateShareholder(address holder, uint256 bps) public",
  "function claim() public",
  "function sharesBps(address) view returns (uint256)",
  "function claimed(address) view returns (uint256)",
];

// --- UTILS ---
const formatAddr = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

const App = () => {
  // State: Connection
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  // State: Contract Data
  const [tokenBalance, setTokenBalance] = useState("0");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [crowdData, setCrowdData] = useState({
    goal: "0",
    total: "0",
    state: "loading",
  });
  const [userData, setUserData] = useState({ shares: "0", claimed: "0" });

  // UI State
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  // Inputs
  const [buyAmount, setBuyAmount] = useState("");
  const [contributeAmount, setContributeAmount] = useState("");

  const showStatus = (text, type = "info") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: "", type: "" }), 5000);
  };

  // Helper to get ethers from window (as it's often injected via script tag in these environments)
  const getEthers = () => {
    if (window.ethers) return window.ethers;
    // Fallback: This allows the code to be descriptive even if the global isn't ready
    return null;
  };

  // --- LOGIC: Connection ---
  const connectWallet = async () => {
    if (!window.ethereum) return showStatus("MetaMask not found", "error");
    const eth = getEthers();
    if (!eth) return showStatus("Ethers library loading...", "error");

    try {
      const _provider = new eth.providers.Web3Provider(window.ethereum);
      const accounts = await _provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setIsOwner(
        accounts[0].toLowerCase() ===
          CONTRACT_ADDRESSES.OwnerAddress.toLowerCase()
      );
    } catch (err) {
      showStatus("Connection failed", "error");
    }
  };

  // --- LOGIC: Fetch Data ---
  const fetchData = useCallback(async () => {
    const eth = getEthers();
    if (!eth || !account || !window.ethereum) return;

    try {
      const _provider = new eth.providers.Web3Provider(window.ethereum);
      const _signer = _provider.getSigner();

      const tokenContract = new eth.Contract(
        CONTRACT_ADDRESSES.FixedPriceToken,
        ERC20_ABI,
        _signer
      );
      const crowdContract = new eth.Contract(
        CONTRACT_ADDRESSES.CrowdFunding,
        CROWDFUNDING_ABI,
        _signer
      );
      const distContract = new eth.Contract(
        CONTRACT_ADDRESSES.DistributeFunding,
        DISTRIBUTE_ABI,
        _signer
      );

      const [balance, price, goal, total, state, shares, claimed] =
        await Promise.all([
          tokenContract.balanceOf(account),
          tokenContract.tokenPriceWei(),
          crowdContract.fundingGoal(),
          crowdContract.totalCollected(),
          crowdContract.fundingState(),
          distContract.sharesBps(account),
          distContract.claimed(account),
        ]);

      setTokenBalance(eth.utils.formatEther(balance));
      setTokenPrice(eth.utils.formatEther(price));
      setCrowdData({
        goal: eth.utils.formatEther(goal),
        total: eth.utils.formatEther(total),
        state: state,
      });
      setUserData({
        shares: shares.toString(),
        claimed: eth.utils.formatEther(claimed),
      });
    } catch (err) {
      console.error("Data fetch error", err);
    }
  }, [account]);

  useEffect(() => {
    if (account) fetchData();
  }, [account, fetchData]);

  // --- LOGIC: Transactions ---
  const handleBuyTokens = async () => {
    const eth = getEthers();
    if (!buyAmount || !eth) return;
    setLoading(true);
    try {
      const _provider = new eth.providers.Web3Provider(window.ethereum);
      const _signer = _provider.getSigner();
      const contract = new eth.Contract(
        CONTRACT_ADDRESSES.FixedPriceToken,
        ERC20_ABI,
        _signer
      );

      const amountWei = eth.utils.parseEther(buyAmount.toString());
      const priceWei = eth.utils.parseEther(tokenPrice.toString());
      const cost = amountWei.mul(priceWei).div(eth.utils.parseEther("1"));

      const tx = await contract.buyTokens(amountWei, { value: cost });
      await tx.wait();
      showStatus("Tokens purchased successfully!", "success");
      fetchData();
    } catch (err) {
      showStatus("Transaction failed", "error");
    }
    setLoading(false);
  };

  const handleContribute = async () => {
    const eth = getEthers();
    if (!eth) return;
    setLoading(true);
    try {
      const _provider = new eth.providers.Web3Provider(window.ethereum);
      const _signer = _provider.getSigner();
      const tokenContract = new eth.Contract(
        CONTRACT_ADDRESSES.FixedPriceToken,
        ERC20_ABI,
        _signer
      );
      const crowdContract = new eth.Contract(
        CONTRACT_ADDRESSES.CrowdFunding,
        CROWDFUNDING_ABI,
        _signer
      );

      const amountWei = eth.utils.parseEther(contributeAmount.toString());
      const approveTx = await tokenContract.approve(
        CONTRACT_ADDRESSES.CrowdFunding,
        amountWei
      );
      await approveTx.wait();

      const tx = await crowdContract.contribute(amountWei);
      await tx.wait();

      showStatus("Contribution successful", "success");
      fetchData();
    } catch (err) {
      showStatus("Contribution failed", "error");
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    const eth = getEthers();
    if (!eth) return;
    setLoading(true);
    try {
      const _provider = new eth.providers.Web3Provider(window.ethereum);
      const _signer = _provider.getSigner();
      const contract = new eth.Contract(
        CONTRACT_ADDRESSES.DistributeFunding,
        DISTRIBUTE_ABI,
        _signer
      );
      const tx = await contract.claim();
      await tx.wait();
      showStatus("Rewards claimed!", "success");
      fetchData();
    } catch (err) {
      showStatus("Claim failed", "error");
    }
    setLoading(false);
  };

  // --- RENDER HELPERS ---
  const ProgressCircle = ({ current, goal }) => {
    const percent =
      Math.min(
        Math.round((parseFloat(current) / parseFloat(goal)) * 100),
        100
      ) || 0;
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              className="text-gray-200 stroke-current"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-indigo-600 stroke-current"
              strokeDasharray={`${percent}, 100`}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">
            {percent}%
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500 font-medium">Goal reached</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* Script injection for environments where ethers isn't pre-installed */}
      <script
        src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"
        type="application/javascript"
      ></script>

      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-indigo-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" /> BlockFund
          </h1>
          <p className="text-slate-500">Decentralized CrowdFunding Ecosystem</p>
        </div>

        {!account ? (
          <button
            onClick={connectWallet}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2"
          >
            <Wallet size={20} /> Connect MetaMask
          </button>
        ) : (
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Connected Wallet
              </span>
              <span className="font-mono text-indigo-600">
                {formatAddr(account)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Balance
              </span>
              <span className="font-bold flex items-center gap-1">
                <Coins size={14} className="text-amber-500" />{" "}
                {parseFloat(tokenBalance).toFixed(2)} BFT
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Status Toasts */}
      {statusMsg.text && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce border ${
            statusMsg.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {statusMsg.type === "error" ? <AlertCircle /> : <CheckCircle2 />}
          {statusMsg.text}
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Panel 1: Buy Tokens */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
              <Coins />
            </div>
            <h2 className="text-xl font-bold">Buy Tokens</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6 italic">
            Price: {tokenPrice} ETH per token
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase ml-1">
                Token Amount
              </label>
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-600 font-medium">
                  Estimated Cost:
                </span>
                <span className="font-bold">
                  {(
                    parseFloat(buyAmount || 0) * parseFloat(tokenPrice)
                  ).toFixed(5)}{" "}
                  ETH
                </span>
              </div>
            </div>
            <button
              disabled={loading || !account || !buyAmount}
              onClick={handleBuyTokens}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Processing..." : "Purchase Tokens"}
            </button>
          </div>
        </section>

        {/* Panel 2: CrowdFunding */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <Users />
              </div>
              <div>
                <h2 className="text-xl font-bold">CrowdFunding Status</h2>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                    crowdData.state === "finantat"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  Status: {crowdData.state}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b pb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Total Collected
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {crowdData.total}{" "}
                    <span className="text-sm font-normal">BFT</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Target Goal
                  </p>
                  <p className="text-xl font-bold text-slate-600">
                    {crowdData.goal} BFT
                  </p>
                </div>
              </div>

              {crowdData.state === "nefinantat" ? (
                <div className="space-y-3">
                  <input
                    type="number"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    placeholder="Contribution amount..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleContribute}
                      disabled={loading || !account || !contributeAmount}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
                    >
                      <ArrowUpCircle size={18} /> Contribute
                    </button>
                    <button
                      onClick={async () => {
                        const eth = getEthers();
                        const _provider = new eth.providers.Web3Provider(
                          window.ethereum
                        );
                        const _signer = _provider.getSigner();
                        const crowdContract = new eth.Contract(
                          CONTRACT_ADDRESSES.CrowdFunding,
                          CROWDFUNDING_ABI,
                          _signer
                        );
                        const tx = await crowdContract.withdraw(
                          eth.utils.parseEther(contributeAmount)
                        );
                        await tx.wait();
                        fetchData();
                      }}
                      disabled={loading || !account || !contributeAmount}
                      className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 flex items-center justify-center gap-2"
                    >
                      <ArrowDownCircle size={18} /> Withdraw
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3 text-green-700">
                  <CheckCircle2 />
                  <span className="font-medium text-sm">
                    Funding Phase Complete. No more contributions accepted.
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <ProgressCircle current={crowdData.total} goal={crowdData.goal} />
            </div>
          </div>
        </section>

        {/* Panel 3: Distribution */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
              <Award />
            </div>
            <h2 className="text-xl font-bold">My Rewards</h2>
          </div>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-sm text-slate-500 font-medium">
                Your Shares (BPS)
              </span>
              <span className="font-black text-purple-600">
                {userData.shares} / 10000
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-sm text-slate-500 font-medium">
                Total Claimed
              </span>
              <span className="font-black">{userData.claimed} BFT</span>
            </div>
          </div>
          <button
            onClick={handleClaim}
            disabled={loading || !account || userData.shares === "0"}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
          >
            Claim Earnings
          </button>
        </section>

        {/* Panel 4: Owner Actions (Conditional) */}
        {isOwner && (
          <section className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <ShieldCheck />
              </div>
              <h2 className="text-xl font-bold">Owner Control Panel</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={async () => {
                  const eth = getEthers();
                  const _provider = new eth.providers.Web3Provider(
                    window.ethereum
                  );
                  const _signer = _provider.getSigner();
                  const sponsor = new eth.Contract(
                    CONTRACT_ADDRESSES.SponsorFunding,
                    SPONSOR_ABI,
                    _signer
                  );
                  const tx = await sponsor.setAllowedCrowdFunding(
                    CONTRACT_ADDRESSES.CrowdFunding,
                    true
                  );
                  await tx.wait();
                  showStatus("CrowdFunding Approved in Sponsor");
                }}
                className="p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:bg-slate-700 text-sm font-semibold transition-all text-left"
              >
                1. Approve CrowdFunding in Sponsor
              </button>
              <button
                onClick={async () => {
                  const eth = getEthers();
                  const _provider = new eth.providers.Web3Provider(
                    window.ethereum
                  );
                  const _signer = _provider.getSigner();
                  const crowd = new eth.Contract(
                    CONTRACT_ADDRESSES.CrowdFunding,
                    CROWDFUNDING_ABI,
                    _signer
                  );
                  const tx = await crowd.finalizeAndRequestSponsorship();
                  await tx.wait();
                  fetchData();
                  showStatus("Sponsorship Requested");
                }}
                className="p-4 bg-indigo-600 rounded-2xl border border-indigo-500 hover:bg-indigo-500 text-sm font-semibold transition-all text-left"
              >
                2. Finalize & Request Sponsorship
              </button>
              <button
                onClick={async () => {
                  const eth = getEthers();
                  const _provider = new eth.providers.Web3Provider(
                    window.ethereum
                  );
                  const _signer = _provider.getSigner();
                  const crowd = new eth.Contract(
                    CONTRACT_ADDRESSES.CrowdFunding,
                    CROWDFUNDING_ABI,
                    _signer
                  );
                  const tx = await crowd.transferToDistribute();
                  await tx.wait();
                  fetchData();
                  showStatus("Funds Transferred to Distribution");
                }}
                className="p-4 bg-green-600 rounded-2xl border border-green-500 hover:bg-green-500 text-sm font-semibold transition-all text-left"
              >
                3. Move Funds to Distribution
              </button>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col justify-center">
                <span className="text-xs text-slate-400 uppercase font-bold">
                  System Integrity
                </span>
                <span className="text-green-400 text-sm font-medium">
                  All Contracts Connected
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto mt-16 text-center text-slate-400 text-sm pb-8">
        &copy; 2024 BlockFund DApp &bull; Built with React & Ethers.js
      </footer>
    </div>
  );
};

export default App;
