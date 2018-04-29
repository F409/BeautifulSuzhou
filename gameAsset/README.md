## GameAsset

A Node.js app

### Prerequisites and setup:

* [Docker](https://www.docker.com/products/overview) - v1.12 or higher
* [Docker Compose](https://docs.docker.com/compose/overview/) - v1.8 or higher
* [Git client](https://git-scm.com/downloads) - needed for clone commands
* **Node.js** v8.4.0 or higher
* [Download Docker images](http://hyperledger-fabric.readthedocs.io/en/latest/samples.html#binaries)


Once you have completed the above setup, you will have provisioned a local network with the following docker container configuration:

* 2 CAs
* A SOLO orderer
* 4 peers (2 peers per Org)

#### Artifacts
* Crypto material has been generated using the **cryptogen** tool from Hyperledger Fabric and mounted to all peers, the orderering node and CA containers. More details regarding the cryptogen tool are available [here](http://hyperledger-fabric.readthedocs.io/en/latest/build_network.html#crypto-generator).
* An Orderer genesis block (genesis.block) and channel configuration transaction (mychannel.tx) has been pre generated using the **configtxgen** tool from Hyperledger Fabric and placed within the artifacts folder. More details regarding the configtxgen tool are available [here](http://hyperledger-fabric.readthedocs.io/en/latest/build_network.html#configuration-transaction-generator).

## Running the program

step1:
```
./runApp.sh

```
step2:
```
./testAPIs.sh
```
In order for the following shell script to properly parse the JSON, you must install ``jq``:

instructions [https://stedolan.github.io/jq/](https://stedolan.github.io/jq/)

With the application started in terminal 1, next, test the APIs by executing the script - **testAPIs.sh**:




### Clean the network

The network will still be running at this point. Before starting the network manually again, here are the commands which cleans the containers and artifacts.

```
docker rm -f $(docker ps -aq)
docker rmi -f $(docker images | grep dev | awk '{print $3}')
rm -rf fabric-client-kv-org[1-2]
```

### Network configuration considerations

You have the ability to change configuration parameters by either directly editing the network-config.yaml file or provide an additional file for an alternative target network. The app uses an optional environment variable "TARGET_NETWORK" to control the configuration files to use. For example, if you deployed the target network on Amazon Web Services EC2, you can add a file "network-config-aws.yaml", and set the "TARGET_NETWORK" environment to 'aws'. The app will pick up the settings inside the "network-config-aws.yaml" file.

#### IP Address** and PORT information

If you choose to customize your docker-compose yaml file by hardcoding IP Addresses and PORT information for your peers and orderer, then you MUST also add the identical values into the network-config.yaml file. The url and eventUrl settings will need to be adjusted to match your docker-compose yaml file.

```
peer1.org1.example.com:
  url: grpcs://x.x.x.x:7056
  eventUrl: grpcs://x.x.x.x:7058

```

#### Discover IP Address

To retrieve the IP Address for one of your network entities, issue the following command:

```
# this will return the IP Address for peer0
docker inspect peer0 | grep IPAddress
```

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
