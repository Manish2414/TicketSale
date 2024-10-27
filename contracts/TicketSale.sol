// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract TicketSale {
    // <contract_variables>
    address public manager;
    uint public ticketPrice;
    uint public totalTickets;
    uint public ticketsSold;
    mapping(uint => address) public ticketOwners;
    mapping(address => uint) public ownedTicket;
    mapping(uint => uint) public resaleTickets;
    mapping(address => uint) public swapOffers;
    uint public constant serviceFeePercent = 10;
    // </contract_variables>

    // Constructor to initialize ticket sale parameters
    constructor(uint numTickets, uint price) public {
        manager = msg.sender;
        totalTickets = numTickets;
        ticketPrice = price;
    }

    // Buy ticket function
    function buyTicket(uint ticketId) public payable {
        require(ticketId > 0 && ticketId <= totalTickets, "Invalid ticket ID");
        require(ticketOwners[ticketId] == address(0), "Ticket already sold");
        require(ownedTicket[msg.sender] == 0, "One ticket per person");
        require(msg.value == ticketPrice, "Incorrect payment amount");
        
        ticketOwners[ticketId] = msg.sender;
        ownedTicket[msg.sender] = ticketId;
        ticketsSold++;
    }

    // Get ticket ID of the buyer
    function getTicketOf(address person) public view returns (uint) {
        return ownedTicket[person];
    }

    // Offer a ticket swap
    function offerSwap(uint ticketId) public {
        require(ownedTicket[msg.sender] == ticketId, "You don't own this ticket");
        swapOffers[msg.sender] = ticketId;
    }

    // Accept a swap offer
    function acceptSwap(uint ticketId) public {
        address swapPartner = address(0);
        for (address addr = address(0); addr < address(type(uint160).max);) {
            if (swapOffers[addr] == ownedTicket[msg.sender]) {
                swapPartner = addr;
                break;
            }
        }
        require(swapPartner != address(0), "No swap offer found");

        uint partnerTicketId = ownedTicket[swapPartner];
        ownedTicket[swapPartner] = ownedTicket[msg.sender];
        ownedTicket[msg.sender] = partnerTicketId;

        swapOffers[swapPartner] = 0;
    }

    // Resale ticket
    function resaleTicket(uint price) public {
        require(ownedTicket[msg.sender] > 0, "You don't own a ticket");
        resaleTickets[ownedTicket[msg.sender]] = price;
    }

    // Accept resale ticket
    function acceptResale(uint ticketId) public payable {
        require(resaleTickets[ticketId] > 0, "Ticket not for resale");
        require(ownedTicket[msg.sender] == 0, "One ticket per person");
        uint resalePrice = resaleTickets[ticketId];
        uint managerFee = (resalePrice * serviceFeePercent) / 100;
        uint sellerAmount = resalePrice - managerFee;

        require(msg.value == resalePrice, "Incorrect payment amount");

        payable(ticketOwners[ticketId]).transfer(sellerAmount);
        payable(manager).transfer(managerFee);

        ticketOwners[ticketId] = msg.sender;
        ownedTicket[msg.sender] = ticketId;
        resaleTickets[ticketId] = 0;
    }

    // Check resale tickets
    function checkResale() public view returns (uint[] memory) {
        uint[] memory ticketsForResale = new uint[](totalTickets);
        uint count = 0;
        for (uint i = 1; i <= totalTickets; i++) {
            if (resaleTickets[i] > 0) {
                ticketsForResale[count] = i;
                count++;
            }
        }
        return ticketsForResale;
    }
}
