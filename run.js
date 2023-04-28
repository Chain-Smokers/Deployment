const { spawn, exec, execSync } = require("child_process");
const fs = require("fs");
const config = require("./config.json");

const bootnodeDir = `./${config.networkName}/${config.bootnodeName}`;
const accounts = require("./accounts.json");
const genesis = require(`./${config.networkName}/genesis.json`);
const nodesDir = Array.from(Array(config.numberOfSealers).keys()).map(
  (nodeNum) => `./${config.networkName}/${config.sealerRootName}${nodeNum + 1}`
);

const bootnode = spawn("bootnode", [
  "-nodekey",
  `${bootnodeDir}/boot.key`,
  "-addr",
  ":30305",
]);
let ethstatsJson = [];
bootnode.stdout.on("data", (data) => {
  // console.log(data.toString());
  if (data.toString().startsWith("enode://")) {
    // execSync("pm2 kill");
    for (let i = 0; i < accounts.length; i++) {
      exec(
        `geth --datadir ${nodesDir[i]} --port ${30306 + i} --authrpc.port ${
          8545 + config.numberOfSealers * 2 + i
        } --http.port ${8545 + i} --bootnodes ${
          data.toString().split("\n")[0]
        } --networkid ${genesis.config.chainId} --unlock 0x${
          accounts[i].address
        } --password password.txt --syncmode full --allow-insecure-unlock --http --http.corsdomain "*" --http.addr 0.0.0.0 --http.api debug,net,eth,shh,web3,txpool --http.vhosts "*" --ws.api "eth,net,web3,network,debug,txpool" --ws --ws.addr 0.0.0.0 --ws.port ${
          8545 + config.numberOfSealers + i
        } --ws.origins "*" --mine`
      );
      // ethstatsJson.push({
      //   name: `${config.sealerRootName}${i + 1}`,
      //   script: "app.js",
      //   log_date_format: "YYYY-MM-DD HH:mm Z",
      //   merge_logs: false,
      //   watch: false,
      //   max_restarts: 10,
      //   exec_interpreter: "node",
      //   exec_mode: "fork_mode",
      //   env: {
      //     NODE_ENV: "production",
      //     RPC_HOST: "localhost",
      //     RPC_PORT: `${8545 + i}`,
      //     LISTENING_PORT: `${30306 + i}`,
      //     INSTANCE_NAME: `${config.sealerRootName}${i + 1}`,
      //     CONTACT_DETAILS: "",
      //     WS_SERVER: `http://${process.env.HOST_ADDRESS}:3000`,
      //     WS_SECRET: `${config.WS_SECRET}`,
      //     VERBOSITY: 2,
      //   },
      // });
    }
    // fs.writeFileSync(
    //   `eth-net-intelligence-api/app.json`,
    //   JSON.stringify(ethstatsJson)
    // );
    // exec("cd eth-net-intelligence-api && pm2 start app.json");
    // exec(
    //   `cd eth-netstats && PORT=3000 WS_SECRET="${config.WS_SECRET}" npm start`
    // );
    // exec("cd explorer && npm start");
    // exec(
    //   "ETHERNAL_EMAIL=tohru1601@gmail.com ETHERNAL_PASSWORD=samba4444 ethernal listen -w Tristate"
    // );
    console.log("\nDone!");
  }
});
