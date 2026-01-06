import deployment from "./31337.json";

export function getDeployment() {
  return {
    chainId: deployment.chainId,
    owner: deployment.deployer,
    token: deployment.token,
    sponsorFunding: deployment.sponsorFunding,
    distributeFunding: deployment.distributeFunding,
    crowdFunding: deployment.crowdFunding,
    config: deployment.config,
  };
}
