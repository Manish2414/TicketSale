const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const { abi, bytecode } = require('../compile');

let accounts;
let ticketSale;

beforeEach(async () => {
  // Get a list of all accounts
  accounts = await web3.eth.getAccounts();
  ticketSale = await new web3.eth.Contract(abi)
    .deploy({
      data: bytecode,
      arguments: [5, web3.utils.toWei('0.1', 'ether')], // 5 tickets at 0.1 ETH each
    })
    .send({ from: accounts[0], gas: 4700000 });
});

// Test case for buying a ticket
describe("TicketSale", () => {
  it("should deploy the contract", () => {
    assert.ok(ticketSale.options.address);
  });

  it("should allow a user to buy a ticket", async () => {
    await ticketSale.methods.buyTicket(1).send({
      from: accounts[1],
      value: web3.utils.toWei('0.1', 'ether')
    });

    const owner = await ticketSale.methods.ticketOwners(1).call();
    assert.strictEqual(owner, accounts[1]);
  });

  it("should not allow a second ticket purchase from the same user", async () => {
    await ticketSale.methods.buyTicket(1).send({
      from: accounts[1],
      value: web3.utils.toWei('0.1', 'ether')
    });

    try {
      await ticketSale.methods.buyTicket(2).send({
        from: accounts[1],
        value: web3.utils.toWei('0.1', 'ether')
      });
      assert.fail("Expected error not received");
    } catch (err) {
      assert(err);
    }
  });

  it("should allow a user to offer a swap", async () => {
    await ticketSale.methods.buyTicket(1).send({
      from: accounts[1],
      value: web3.utils.toWei('0.1', 'ether')
    });

    await ticketSale.methods.offerSwap(1).send({ from: accounts[1] });

    const swapOffer = await ticketSale.methods.swapOffers(accounts[1]).call();
    assert.strictEqual(swapOffer.toString(), '1');
  });

  it("should allow a user to accept a swap offer", async () => {
    await ticketSale.methods.buyTicket(1).send({
      from: accounts[1],
      value: web3.utils.toWei('0.1', 'ether')
    });
    await ticketSale.methods.buyTicket(2).send({
      from: accounts[2],
      value: web3.utils.toWei('0.1', 'ether')
    });

    await ticketSale.methods.offerSwap(1).send({ from: accounts[1] });
    await ticketSale.methods.offerSwap(2).send({ from: accounts[2] });

    await ticketSale.methods.acceptSwap(1).send({ from: accounts[2] });

    const owner1 = await ticketSale.methods.ticketOwners(1).call();
    const owner2 = await ticketSale.methods.ticketOwners(2).call();

    assert.strictEqual(owner1, accounts[2]);
    assert.strictEqual(owner2, accounts[1]);
  });

  it("should allow resale of a ticket", async () => {
    await ticketSale.methods.buyTicket(1).send({
      from: accounts[1],
      value: web3.utils.toWei('0.1', 'ether')
    });

    await ticketSale.methods.resaleTicket(web3.utils.toWei('0.2', 'ether')).send({ from: accounts[1] });

    const resalePrice = await ticketSale.methods.resaleTickets(1).call();
    assert.strictEqual(resalePrice.toString(), web3.utils.toWei('0.2', 'ether'));
  });

  it("should allow a user to accept a resale ticket", async () => {
    await ticketSale.methods.buyTicket(1).send({
      from: accounts[1],
      value: web3.utils.toWei('0.1', 'ether')
    });
    await ticketSale.methods.resaleTicket(web3.utils.toWei('0.2', 'ether')).send({ from: accounts[1] });

    await ticketSale.methods.acceptResale(1).send({
      from: accounts[2],
      value: web3.utils.toWei('0.2', 'ether')
    });

    const newOwner = await ticketSale.methods.ticketOwners(1).call();
    assert.strictEqual(newOwner, accounts[2]);
  });
});
