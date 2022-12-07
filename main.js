const { execSync, spawn, exec } = require("child_process");
const fs = require("fs");

const config = require("./config.json");

const rootDir = `./${config.networkName}`;
const bootnodeDir = `./${config.networkName}/${config.bootnodeName}`;
const nodesDir = Array.from(Array(config.numberOfSealers).keys()).map(
  (nodeNum) => `./${config.networkName}/${config.sealerRootName}${nodeNum + 1}`
);
fs.writeFileSync("password.txt", config.accountPassword);
if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });
if (!fs.existsSync(bootnodeDir))
  fs.mkdirSync(bootnodeDir, { recursive: true });

nodesDir.forEach((nodeDir) => {
  if (!fs.existsSync(nodeDir))
    fs.mkdirSync(nodeDir, { recursive: true });
  execSync(
    `geth --datadir ${nodeDir} account new --password ./password.txt`,
    (err, stdout, stderr) => console.log(stdout)
  );
});
execSync(
  `printf "[${nodesDir.map(
    (nodeDir) => `$(cat ${nodeDir}/keystore/*)`
  )}]" > accounts.json`
);
const accounts = require("./accounts.json");
const randomChainId = () => Math.floor(Math.random() * 99998) + 1;
const addresses = accounts.map((account) => account.address).sort();
let genesis = {
  config: {
    chainId: 0,
    homesteadBlock: 0,
    eip150Block: 0,
    eip150Hash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    eip155Block: 0,
    eip158Block: 0,
    byzantiumBlock: 0,
    constantinopleBlock: 0,
    petersburgBlock: 0,
    istanbulBlock: 0,
    clique: {
      period: 0,
      epoch: 30000,
    },
  },
  nonce: "0x0",
  timestamp: "",
  extraData: "",
  gasLimit: "0x47b760",
  difficulty: "0x1",
  mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  coinbase: "0x0000000000000000000000000000000000000000",
  alloc: {},
  number: "0x0",
  gasUsed: "0x0",
  parentHash:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  baseFeePerGas: null,
};
addresses.forEach((address) => {
  genesis.alloc[address] = {
    balance:
      "0x200000000000000000000000000000000000000000000000000000000000000",
  };
});
genesis.timestamp =
  "0x" + parseInt(Date.now().toString().slice(0, -3)).toString(16);
genesis.extraData =
  "0x" + "0".repeat(64) + addresses.join("") + "0".repeat(130);
genesis.config.chainId = randomChainId();
fs.writeFileSync(`${rootDir}/genesis.json`, JSON.stringify(genesis));

nodesDir.forEach((nodeDir) => { execSync(`geth init --datadir ${nodeDir} ${rootDir}/genesis.json`) })
execSync(`bootnode -genkey ${bootnodeDir}/boot.key`)
const bootnode = spawn("bootnode", ["-nodekey", `${bootnodeDir}/boot.key`, "-addr", ":30305"])

execSync("pm2 kill")
execSync("git clone https://github.com/cubedro/eth-netstats.git && cd eth-netstats && npm install && grunt all")
execSync("git clone https://github.com/cubedro/eth-net-intelligence-api.git && cd eth-net-intelligence-api && npm install")
execSync("git clone https://github.com/etherparty/explorer.git && cd explorer && npm install")
let ethstatsJson = []
bootnode.stdout.on('data', (data) => {
  if (data.toString().startsWith("enode://")) {
    for (let i = 0; i < accounts.length; i++) {
      exec(`geth --datadir ${nodesDir[i]} --port ${30306 + i} --authrpc.port ${8545 + config.numberOfSealers + i} --http.port ${8545 + i} --bootnodes ${data.toString().split("\n")[0]} --networkid ${genesis.config.chainId} --unlock 0x${accounts[i].address} --password password.txt --syncmode full --allow-insecure-unlock --http --http.corsdomain "*" --mine`)
      ethstatsJson.push({
        "name": `${config.sealerRootName}${i + 1}`,
        "script": "app.js",
        "log_date_format": "YYYY-MM-DD HH:mm Z",
        "merge_logs": false,
        "watch": false,
        "max_restarts": 10,
        "exec_interpreter": "node",
        "exec_mode": "fork_mode",
        "env":
        {
          "NODE_ENV": "production",
          "RPC_HOST": "localhost",
          "RPC_PORT": `${8545 + i}`,
          "LISTENING_PORT": `${30306 + i}`,
          "INSTANCE_NAME": `${config.sealerRootName}${i + 1}`,
          "CONTACT_DETAILS": "",
          "WS_SERVER": "http://localhost:3000",
          "WS_SECRET": `${config.WS_SECRET}`,
          "VERBOSITY": 2
        }
      })
    }
    fs.writeFileSync(`eth-net-intelligence-api/app.json`, JSON.stringify(ethstatsJson));
    exec("cd eth-net-intelligence-api && pm2 start app.json")
    exec(`cd eth-netstats && PORT=3000 WS_SECRET="${config.WS_SECRET}" npm start`)
    exec("cd explorer && npm start")
    console.log("\nDone!")
  }
})

