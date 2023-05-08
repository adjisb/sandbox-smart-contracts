// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import { MockImplementation } from "./mocks/MockImplementation.sol";
import { MockUpgradable } from "./mocks/MockUpgradable.sol";
import { MockUpgradableV2 } from "./mocks/MockUpgradableV2.sol";
import { CollectionFactory } from "contracts/proxy/CollectionFactory.sol";
import { CollectionProxy } from "contracts/proxy/CollectionProxy.sol";
import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";
import { UpgradeableBeacon } from "openzeppelin-contracts/proxy/beacon/UpgradeableBeacon.sol";

contract CollectionFactoryTest is Test {

    // helper struct used for easy compare of value passing via proxy deploy to initialize
    struct TestDataForInitialize {
        address _owner;
        string _name;
        address payable _someAddress;
        address _addressTwo;
        bool _someBool;
        uint256 _maxSupply;
    }

    CollectionFactory collectionFactory;
    address collectionFactoryOwner;
    address avatarCollectionImplementation;
    address implementation;
    address implementation2;
    address alice;
    address bob;
    bytes32 centralAlias = "centralAlias";
    bytes32 secondaryAlias = "secondaryAlias";

    function setUp() public {
        collectionFactoryOwner = makeAddr("collectionFactoryOwner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vm.prank(collectionFactoryOwner);
        collectionFactory = new CollectionFactory();

        implementation = address(new MockUpgradable());
        implementation2 = address(new MockUpgradableV2());
    }

    /*
        testing deployBeacon
            - can only be called by owner
            - successful deploy
            - input validation works
            - respects other invariants
    */

    function test_deployBeacon_revertsIfNotOwner() public {
        bytes32 alias_ = "centra";

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(alice);
        collectionFactory.deployBeacon(implementation, alias_);
    }

    function test_deployBeacon_successful() public {

        vm.expectRevert();
        collectionFactory.getBeaconAlias(0);

        vm.prank(collectionFactoryOwner);
        bytes32 alias_ = "central";
        address deployedBeacon = collectionFactory.deployBeacon(implementation, alias_);

        address savedImplementation = UpgradeableBeacon(deployedBeacon).implementation();
        assertEq(savedImplementation, implementation);

        bytes32 savedAlias = collectionFactory.getBeaconAlias(0);
        assertEq(alias_, savedAlias);
        address savedBeacon = collectionFactory.aliasToBeacon(savedAlias);
        assertEq(deployedBeacon, savedBeacon);

        address[] memory beacons = collectionFactory.getBeacons();
        assertEq(beacons.length, 1);
    }

    function test_deployBeacon_inputValidationWorks() public {

        bytes32 alias_ = "central";

        vm.expectRevert("UpgradeableBeacon: implementation is not a contract");
        vm.prank(collectionFactoryOwner);
        collectionFactory.deployBeacon(bob, alias_);

        vm.expectRevert("UpgradeableBeacon: implementation is not a contract");
        vm.prank(collectionFactoryOwner);
        collectionFactory.deployBeacon(address(0x0), alias_);

    }

    function test_deployBeacon_respectsOtherInvariants() public {

        bytes32 alias_ = "central";

        vm.expectRevert();
        collectionFactory.getCollection(0);

        vm.prank(collectionFactoryOwner);
        collectionFactory.deployBeacon(implementation, alias_);

        vm.expectRevert();
        collectionFactory.getCollection(0);

        vm.startPrank(collectionFactoryOwner);
        vm.expectRevert("CollectionFactory: beacon alias cannot be empty");
        collectionFactory.deployBeacon(implementation, "");

        vm.expectRevert("CollectionFactory: beacon alias already used");
        collectionFactory.deployBeacon(implementation, alias_);

        vm.stopPrank();
    }

    /*
        testing addBeacon
            - can only be called by owner
            - successful deploy
            - input validation works
            - respects other invariants
    */

    function test_addBeacon_revertsIfNotOwner() public {
        bytes32 alias_ = "central";
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(alice);
        collectionFactory.addBeacon(implementation, alias_);
    }

    function test_addBeacon_successful() public {

        bytes32 alias_ = "secondAlias";

        vm.expectRevert();
        collectionFactory.getCollection(0);

        vm.startPrank(collectionFactoryOwner);
        address createdBeacon = address(new UpgradeableBeacon(implementation));

        UpgradeableBeacon(createdBeacon).transferOwnership(address(collectionFactory));

        collectionFactory.addBeacon(createdBeacon, alias_);
        vm.stopPrank();


        bytes32 savedAlias = collectionFactory.getBeaconAlias(0);
        assertEq(alias_, savedAlias);
        address savedBeacon = collectionFactory.aliasToBeacon(savedAlias);
        assertEq(createdBeacon, savedBeacon);

        address[] memory beacons = collectionFactory.getBeacons();
        assertEq(beacons.length, 1);
    }

    function test_addBeacon_inputValidationWorks() public {

        vm.startPrank(collectionFactoryOwner);
        address createdBeacon = address(new UpgradeableBeacon(implementation));

        vm.expectRevert("CollectionFactory: beacon is not a contract");
        collectionFactory.addBeacon(bob, centralAlias);

        vm.expectRevert("CollectionFactory: ownership must be given to factory");
        collectionFactory.addBeacon(createdBeacon, centralAlias);

        UpgradeableBeacon(createdBeacon).transferOwnership(address(collectionFactory));

        vm.expectRevert("CollectionFactory: beacon alias cannot be empty");
        collectionFactory.addBeacon(createdBeacon, "");

        collectionFactory.addBeacon(createdBeacon, centralAlias);

        vm.expectRevert("CollectionFactory: beacon alias already used");
        collectionFactory.addBeacon(createdBeacon, centralAlias);
        vm.stopPrank();
    }

    function test_addBeacon_respectsOtherInvariants() public {

        vm.expectRevert();
        collectionFactory.getCollection(0);

        vm.startPrank(collectionFactoryOwner);
        address createdBeacon = address(new UpgradeableBeacon(implementation));
        UpgradeableBeacon(createdBeacon).transferOwnership(address(collectionFactory));
        collectionFactory.addBeacon(createdBeacon, centralAlias);
        vm.stopPrank();

        vm.expectRevert();
        collectionFactory.getCollection(0);
    }

    /*
        testing deployCollection
            - can only be called by owner
            - successful deploy
            - input validation works
            - respects other invariants
    */

    function test_deployCollection_revertsIfNotFactoryOwner() public {

        vm.prank(collectionFactoryOwner);
        bytes32 alias_ = "central";
        collectionFactory.deployBeacon(implementation, alias_);
        bytes memory args = _defaultArgsData();

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(alice);
        collectionFactory.deployCollection(alias_, args);
    }

    function test_deployCollection_successful() public {

        vm.expectRevert();
        collectionFactory.getCollection(0);

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "central";
        address deployedBeacon = collectionFactory.deployBeacon(implementation, alias_);
        bytes memory args = _defaultArgsData();
        address returnedCollection = collectionFactory.deployCollection(alias_, args);
        vm.stopPrank();

        address newlyAddedCollection = collectionFactory.getCollection(0);

        assertEq(returnedCollection, newlyAddedCollection);

        address mappedBeaconToCollection = collectionFactory.beaconOf(newlyAddedCollection);
        assertEq(mappedBeaconToCollection, deployedBeacon);

        address[] memory collections = collectionFactory.getCollections();
        assertEq(collections.length, 1);
    }

    function test_deployCollection_inputValidationWorks() public {

        vm.startPrank(collectionFactoryOwner);
        collectionFactory.deployBeacon(implementation, "anotherOne");
        bytes memory args = _defaultArgsData();

        vm.expectRevert("CollectionFactory: beacon is not tracked");
        collectionFactory.deployCollection("not_tracked", args);

        vm.stopPrank();
    }

    function test_deployCollection_respectsOtherInvariants() public {

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "honor";
        collectionFactory.deployBeacon(implementation, alias_);

        address[] memory beforeBeacons = collectionFactory.getBeacons();
        assertEq(beforeBeacons.length, 1);

        bytes memory args = _defaultArgsData();
        collectionFactory.deployCollection(alias_, args);
        vm.stopPrank();

        address[] memory afterBeacons = collectionFactory.getBeacons();

        assertEq(beforeBeacons.length, afterBeacons.length);
        assertEq(beforeBeacons[0], afterBeacons[0]);
    }

    /*
        testing updateCollection
            - can not be called by random address
            - successful update from factory owner (no init args)
            - successful update from collection owner (no init args)
            - input validation works
            - respects other invariants
    */

    function test_updateCollection_revertsIfNotFactoryOwnerOrCollectionOwner() public {
        bytes memory updateArgs;

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "debug";
        collectionFactory.deployBeacon(implementation, alias_);
        bytes memory args = _defaultArgsData();
        address returnedCollection = collectionFactory.deployCollection(alias_, args);

        collectionFactory.deployBeacon(implementation2, secondaryAlias);
        vm.stopPrank();

        vm.expectRevert("CollectionFactory: caller is not collection or factory owner");
        collectionFactory.updateCollection(returnedCollection, secondaryAlias, updateArgs);
    }

    function _updateCollection_successful_noUpdateArgs(address user) public {
        bytes memory updateArgs;

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "theAnswer";
        collectionFactory.deployBeacon(implementation, alias_);
        bytes memory args = _defaultArgsData();
        address returnedCollection = collectionFactory.deployCollection(alias_, args);

        collectionFactory.deployBeacon(implementation2, secondaryAlias);
        vm.stopPrank();

        vm.startPrank(user);
        collectionFactory.updateCollection(returnedCollection, secondaryAlias, updateArgs);
        vm.stopPrank();
    }

    function test_updateCollection_successful_factoryOwner_noUpdateArgs() public {
        _updateCollection_successful_noUpdateArgs(collectionFactoryOwner);
    }

    function test_updateCollection_successful_collectionOwner_noUpdateArgs() public {
        _updateCollection_successful_noUpdateArgs(alice);
    }

    function test_updateCollection_inputValidationWorks() public {

        bytes memory updateArgs;

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "central";
        collectionFactory.deployBeacon(implementation, alias_);
        bytes memory args = _defaultArgsData();
        address returnedCollection = collectionFactory.deployCollection(alias_, args);
        collectionFactory.deployBeacon(implementation2, secondaryAlias);

        vm.expectRevert("CollectionFactory: beacon is not tracked");
        collectionFactory.updateCollection(returnedCollection, "random", updateArgs);

        vm.expectRevert("CollectionFactory: collection is not tracked");
        collectionFactory.updateCollection(address(0x0), secondaryAlias, updateArgs);

        vm.stopPrank();
    }

    function test_updateCollection_respectsOtherInvariants() public {

        bytes memory updateArgs;

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "secondary";
        collectionFactory.deployBeacon(implementation, alias_);

        bytes memory args = _defaultArgsData();
        address returnedCollection = collectionFactory.deployCollection(alias_, args);

        address[] memory beforeCollections = collectionFactory.getCollections();
        assertEq(beforeCollections.length, 1);

        collectionFactory.deployBeacon(implementation2, secondaryAlias);

        address[] memory beforeBeacons = collectionFactory.getBeacons();
        assertEq(beforeBeacons.length, 2);

        collectionFactory.updateCollection(returnedCollection, secondaryAlias, updateArgs);
        vm.stopPrank();

        address[] memory afterCollections = collectionFactory.getCollections();
        assertEq(beforeCollections.length, afterCollections.length);
        assertEq(beforeCollections[0], afterCollections[0]);

        address[] memory afterBeacons = collectionFactory.getBeacons();

        assertEq(beforeBeacons.length, afterBeacons.length);
        assertEq(beforeBeacons[0], afterBeacons[0]);
        assertEq(beforeBeacons[1], afterBeacons[1]);
    }

    /*
        testing updateBeaconImplementation
            - can not be called by random address
            - successful update
            - input validation works
            - respects other invariants
    */

    function test_updateBeaconImplementation_revertsIfNotFactoryOwner() public {

        vm.prank(collectionFactoryOwner);
        bytes32 alias_ = "main";
        collectionFactory.deployBeacon(implementation, alias_);

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(alice);
        collectionFactory.updateBeaconImplementation(secondaryAlias, implementation2);
    }

    function test_updateBeaconImplementation_successful() public {

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "central";
        address deployedBeacon = collectionFactory.deployBeacon(implementation, alias_);

        collectionFactory.updateBeaconImplementation(alias_, implementation2);

        address secondImplementation = UpgradeableBeacon(deployedBeacon).implementation();

        assertEq(implementation2, secondImplementation, "updated beacon implementation should be the passed one");
        vm.stopPrank();
    }

    function test_updateBeaconImplementation_inputValidationWorks() public {

        vm.startPrank(collectionFactoryOwner);

        vm.expectRevert("CollectionFactory: beacon is not tracked");
        collectionFactory.updateBeaconImplementation("random", implementation2);

        vm.stopPrank();

    }

    function test_updateBeaconImplementation_respectsOtherInvariants() public {

        vm.startPrank(collectionFactoryOwner);
        bytes32 alias_ = "central";
        collectionFactory.deployBeacon(implementation, alias_);

        address[] memory beforeCollections = collectionFactory.getCollections();
        assertEq(beforeCollections.length, 0);

        address[] memory beforeBeacons = collectionFactory.getBeacons();
        assertEq(beforeBeacons.length, 1);

        collectionFactory.updateBeaconImplementation(alias_, implementation2);

        address[] memory afterCollections = collectionFactory.getCollections();
        assertEq(beforeCollections.length, afterCollections.length);

        address[] memory afterBeacons = collectionFactory.getBeacons();
        assertEq(beforeBeacons.length, afterBeacons.length);
        assertEq(beforeBeacons[0], afterBeacons[0]);
    }

    /*
        testing transferBeacon
            - can only be called by owner
            - successful transferred the beacon
            - input validation works
            - respects other invariants test
    */

    function test_transferBeacon_revertsIfNotFactoryOwner() public {

        vm.prank(collectionFactoryOwner);
        bytes32 alias_ = "main";
        collectionFactory.deployBeacon(implementation, alias_);

        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        collectionFactory.transferBeacon(alias_, bob);
    }

    function test_transferBeacon_successful() public {

        vm.startPrank(collectionFactoryOwner);
        // deploy 2 beacons
        address beacon1 = collectionFactory.deployBeacon(implementation, centralAlias);
        address beacon2 = collectionFactory.deployBeacon(implementation2, secondaryAlias);

        // sanity check that there are 2 beacons
        uint256 originalBeaconCount = collectionFactory.beaconCount();
        assertEq(originalBeaconCount, 2, "Initial beacon count assessment failed");

        // check that there are aliases mapped (revers if they are not)
        assertEq(collectionFactory.aliasToBeacon(centralAlias), beacon1, "Initial aliasToBeacon assessment failed for beacon 1");
        assertEq(collectionFactory.aliasToBeacon(secondaryAlias), beacon2, "Initial aliasToBeacon assessment failed for beacon 2");

        // deploying 3 collections
        bytes memory args = _defaultArgsData();
        collectionFactory.deployCollection(centralAlias, args);
        collectionFactory.deployCollection(secondaryAlias, args);
        collectionFactory.deployCollection(centralAlias, args);

        // save original count
        uint256 originalCollectionCount = collectionFactory.collectionCount();
        assertEq(originalCollectionCount, 3, "Initial collection count assessment failed");

        // see that they exist and code doesn't revert
        collectionFactory.getCollection(0);
        collectionFactory.getCollection(1);
        collectionFactory.getCollection(2);

        // original beacon owner is factory
        assertEq(UpgradeableBeacon(beacon1).owner(), address(collectionFactory), "Initial beacon 1 owner assessment failed");
        assertEq(UpgradeableBeacon(beacon2).owner(), address(collectionFactory), "Initial beacon 2 owner assessment failed");

        // transfer first beacon (2 collections)
        collectionFactory.transferBeacon(centralAlias, alice);

        // check variants were successfully modified
        uint256 afterBeacon1RemovedCount = collectionFactory.beaconCount();
        assertEq(afterBeacon1RemovedCount, 1, "first transfer beaconCount value assessment failed");
        assertEq(afterBeacon1RemovedCount, originalBeaconCount - 1, "first transfer beaconCount RELATIVE value assessment failed");

        // check that only 1 beacon was deleted, not the other
        assertEq(collectionFactory.aliasToBeacon(centralAlias), address(0), "first transfer aliasToBeacon assessment failed for beacon 1");
        assertEq(collectionFactory.aliasToBeacon(secondaryAlias), beacon2, "first transfer aliasToBeacon assessment failed for beacon 2");

        collectionFactory.getCollection(0);

        // see that the owner has changed
        assertEq(UpgradeableBeacon(beacon1).owner(), address(alice), "first transfer beacon 1 owner assessment failed");
        assertEq(UpgradeableBeacon(beacon2).owner(), address(collectionFactory), "first transfer beacon 2 owner assessment failed");

        // transfer second beacon (1 collection)
        collectionFactory.transferBeacon(secondaryAlias, bob);
        uint256 lastBeaconRemovedCount = collectionFactory.beaconCount();
        assertEq(lastBeaconRemovedCount, 0, "last transfer beaconCount value assessment failed");
        assertEq(lastBeaconRemovedCount, afterBeacon1RemovedCount - 1, "last transfer beaconCount RELATIVE value assessment failed");

        // check that both beacons were deleted
        assertEq(collectionFactory.aliasToBeacon(centralAlias), address(0), "last transfer aliasToBeacon assessment failed for beacon 1");
        assertEq(collectionFactory.aliasToBeacon(secondaryAlias), address(0), "last transfer aliasToBeacon assessment failed for beacon 2");

        // see that the owner has changed
        assertEq(UpgradeableBeacon(beacon1).owner(), address(alice), "last transfer beacon 1 owner assessment failed");
        assertEq(UpgradeableBeacon(beacon2).owner(), address(bob), "last transfer beacon 2 owner assessment failed");

        vm.stopPrank();
    }

    function test_transferBeacon_inputValidationWorks() public {

        vm.startPrank(collectionFactoryOwner);
        collectionFactory.deployBeacon(implementation, centralAlias);

        vm.expectRevert("CollectionFactory: beacon is not tracked");
        collectionFactory.transferBeacon("not", alice);

        vm.expectRevert("CollectionFactory: new owner cannot be 0 address");
        collectionFactory.transferBeacon(centralAlias, address(0));

        vm.stopPrank();
    }

    function test_transferBeacon_respectsOtherInvariants() public {

        vm.startPrank(collectionFactoryOwner);
        // deploy 2 beacons
        address beacon1 = collectionFactory.deployBeacon(implementation, centralAlias);
        address beacon2 = collectionFactory.deployBeacon(implementation2, secondaryAlias);

        // check that there are aliases mapped (revers if they are not)
        assertEq(collectionFactory.aliasToBeacon(centralAlias), beacon1, "Initial aliasToBeacon assessment failed for beacon 1");
        assertEq(collectionFactory.aliasToBeacon(secondaryAlias), beacon2, "Initial aliasToBeacon assessment failed for beacon 2");

        // deploying 3 collections
        bytes memory args = _defaultArgsData();
        collectionFactory.deployCollection(centralAlias, args);
        collectionFactory.deployCollection(secondaryAlias, args);
        collectionFactory.deployCollection(centralAlias, args);

        // save original count
        uint256 originalCollectionCount = collectionFactory.collectionCount();

        //////////////////////////////////////////////////////////////
        assertEq(originalCollectionCount, 3, "Initial collection count assessment failed");

        // see that they exist and code doesn't revert
        collectionFactory.getCollection(0);
        collectionFactory.getCollection(1);
        collectionFactory.getCollection(2);

        assertEq(UpgradeableBeacon(beacon2).owner(), address(collectionFactory), "Initial beacon 2 owner assessment failed");

        // transfer first beacon (2 collections)
        collectionFactory.transferBeacon(centralAlias, alice);

        // see that they exist after removal and code doesn't revert
        collectionFactory.getCollection(0);
        collectionFactory.getCollection(1);
        collectionFactory.getCollection(2);

        // check collection count after remove
        uint256 firstRemoveCollectionCount = collectionFactory.collectionCount();
        assertEq(firstRemoveCollectionCount, originalCollectionCount, "remove collectionCount RELATIVE value assessment failed");
        assertEq(firstRemoveCollectionCount, 3, "remove collectionCount value assessment failed");

        // see that the owner has changed
        assertEq(UpgradeableBeacon(beacon2).owner(), address(collectionFactory), "last transfer beacon 2 owner assessment failed");

        vm.stopPrank();
    }

    /*
        testing transferCollections
            - works successfully
            - input validation works
            - respects other invariants test
    */

    function test_transferCollections_revertsIfNotFactoryOwner() public {
        vm.startPrank(collectionFactoryOwner);
        collectionFactory.deployBeacon(implementation, centralAlias);

        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));
        vm.stopPrank();

        // sanity check
        assertEq(collection.proxyAdmin(), address(collectionFactory));
        address[] memory collections = new address[](1);
        collections[0] = address(collection);

        vm.expectRevert("Ownable: caller is not the owner");
        collectionFactory.transferCollections(collections, alice);
    }

    function test_transferCollections_successful() public {
        vm.startPrank(collectionFactoryOwner);
        collectionFactory.deployBeacon(implementation, centralAlias);

        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));

        // sanity check
        assertEq(collection.proxyAdmin(), address(collectionFactory));

        uint256 initialCollectionCount = collectionFactory.collectionCount();

        address[] memory collections = new address[](1);
        collections[0] = address(collection);
        collectionFactory.transferCollections(collections, alice);

        assertEq(initialCollectionCount - 1, collectionFactory.collectionCount());
        assertEq(0, collectionFactory.collectionCount());
        assertEq(collection.proxyAdmin(), alice);
        vm.stopPrank();
    }

    function test_transferCollections_inputValidationWorks() public {
        vm.startPrank(collectionFactoryOwner);
        collectionFactory.deployBeacon(implementation, centralAlias);

        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));
        vm.stopPrank();

        // sanity check
        assertEq(collection.proxyAdmin(), address(collectionFactory));
        address[] memory collections = new address[](1);
        collections[0] = address(collection);

        vm.expectRevert("Ownable: caller is not the owner");
        collectionFactory.transferCollections(collections, alice);

        vm.startPrank(collectionFactoryOwner);
        vm.expectRevert("CollectionFactory: new owner cannot be 0 address");
        collectionFactory.transferCollections(collections, address(0));

        collections[0] = address(0xdead);
        vm.expectRevert("CollectionFactory: failed to remove collection");
        collectionFactory.transferCollections(collections, alice);
        vm.stopPrank();
    }

    function test_transferCollections_respectsOtherInvariants() public {
        vm.startPrank(collectionFactoryOwner);
        collectionFactory.deployBeacon(implementation, centralAlias);

        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));

        uint256 initialBeaconCount = collectionFactory.beaconCount();

        address[] memory collections = new address[](1);
        collections[0] = address(collection);
        collectionFactory.transferCollections(collections, alice);

        assertEq(initialBeaconCount, collectionFactory.beaconCount());

        vm.stopPrank();
    }
    /*
        testing addCollections
            - works successfully
            - input validation works
            - respects other invariants test
    */

    function test_addCollections_inputValidationWorks() public {
        vm.startPrank(collectionFactoryOwner);

        // setup
        collectionFactory.deployBeacon(implementation, centralAlias);
        collectionFactory.deployBeacon(implementation2, secondaryAlias);
        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));
        CollectionProxy secondCollection = CollectionProxy(payable(collectionFactory.deployCollection(secondaryAlias, args)));
        address[] memory collections = new address[](1);
        collections[0] = address(collection);
        collectionFactory.transferCollections(collections, alice);
        // done setup
        vm.stopPrank();

        vm.expectRevert("Ownable: caller is not the owner");
        collectionFactory.addCollections(collections);

        vm.startPrank(collectionFactoryOwner);

        address[] memory emptyCollections = new address[](0);
        vm.expectRevert("CollectionFactory: empty collection list");
        collectionFactory.addCollections(emptyCollections);

        address[] memory zeroedCollections = new address[](5);
        vm.expectRevert("CollectionFactory: collection is zero address");
        collectionFactory.addCollections(zeroedCollections);

        vm.expectRevert("CollectionFactory: owner of collection must be factory");
        collectionFactory.addCollections(collections);

        address[] memory duplicatedCollections = new address[](1);
        duplicatedCollections[0] = address(secondCollection);
        vm.expectRevert("CollectionFactory: failed to add collection");
        collectionFactory.addCollections(duplicatedCollections);

        // remove the ownership of the beacon connected to the collection for the next revert to be triggered
        collectionFactory.transferBeacon(centralAlias, alice);
        // readd ownership of collection to collection factory in order to reach that error
        vm.stopPrank();

        vm.prank(alice);
        collection.changeCollectionProxyAdmin(address(collectionFactory));

        vm.prank(collectionFactoryOwner);
        vm.expectRevert("CollectionFactory: ownership must be given to factory");
        collectionFactory.addCollections(collections);


    }

    function test_addCollections_successful() public {
        vm.startPrank(collectionFactoryOwner);

        // setup
        collectionFactory.deployBeacon(implementation, centralAlias);
        collectionFactory.deployBeacon(implementation2, secondaryAlias);
        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));
        collectionFactory.deployCollection(secondaryAlias, args);
        address[] memory collections = new address[](1);
        collections[0] = address(collection);
        collectionFactory.transferCollections(collections, alice);
        vm.stopPrank();

        vm.prank(alice);
        collection.changeCollectionProxyAdmin(address(collectionFactory));
        // done setup

        uint256 initialCollectionCount = collectionFactory.collectionCount();

        // sanity check
        assertEq(1, collectionFactory.collectionCount());

        vm.prank(collectionFactoryOwner);
        collectionFactory.addCollections(collections);

        assertEq(initialCollectionCount + 1 , collectionFactory.collectionCount());
        assertEq(2 , collectionFactory.collectionCount());
    }

    function test_addCollections_respectsOtherInvariants() public {
        vm.startPrank(collectionFactoryOwner);

        // setup
        collectionFactory.deployBeacon(implementation, centralAlias);
        collectionFactory.deployBeacon(implementation2, secondaryAlias);
        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));
        collectionFactory.deployCollection(secondaryAlias, args);
        address[] memory collections = new address[](1);
        collections[0] = address(collection);
        collectionFactory.transferCollections(collections, alice);
        vm.stopPrank();

        vm.prank(alice);
        collection.changeCollectionProxyAdmin(address(collectionFactory));

        uint256 originalBeaconCount = collectionFactory.beaconCount();

        vm.prank(collectionFactoryOwner);
        collectionFactory.addCollections(collections);

        assertEq(originalBeaconCount, collectionFactory.beaconCount());
    }
    /*
    testing
            getBeaconAliases - works successfully
            beaconOf - checks if collection exists
            renounceOwnership - reverts
    */

    function test_getBeaconAliases_successful() public {
        vm.startPrank(collectionFactoryOwner);

        // setup
        collectionFactory.deployBeacon(implementation, centralAlias);
        collectionFactory.deployBeacon(implementation2, secondaryAlias);

        bytes32[] memory aliases = collectionFactory.getBeaconAliases();

        assertEq(aliases.length, 2);

        for (uint256 index = 0; index < collectionFactory.beaconCount(); index++) {
            assertEq(aliases[index], collectionFactory.getBeaconAlias(index));
        }

        vm.stopPrank();
    }

    function test_beaconOf_inputValidation() public {
        vm.startPrank(collectionFactoryOwner);

        // setup
        collectionFactory.deployBeacon(implementation, centralAlias);
        collectionFactory.deployBeacon(implementation2, secondaryAlias);
        bytes memory args = _defaultArgsData();
        CollectionProxy collection = CollectionProxy(payable(collectionFactory.deployCollection(centralAlias, args)));
        vm.stopPrank();

        assertEq(collectionFactory.aliasToBeacon(centralAlias), collectionFactory.beaconOf(address(collection)));
    }

    function test_renounceOwnership_reverts() public {
        vm.prank(collectionFactoryOwner);
        vm.expectRevert("CollectionFactory: renounce ownership is not available");
        collectionFactory.renounceOwnership();
    }

    /*//////////////////////////////////////////////////////////////
                            Helper functions
    //////////////////////////////////////////////////////////////*/

    function _defaultArgsData() public returns (bytes memory initializationArguments) {
        TestDataForInitialize memory t;
        t._owner = alice;
        t._name = "TestContract";
        t._someAddress = payable(makeAddr("someAddress"));
        t._addressTwo = makeAddr("addressTwo");
        t._someBool = true;
        t._maxSupply = 555;
        initializationArguments = _encodeInitializationARguments(t);
    }
    //////////////////////////// HELPER FUNCTIONS ////////////////////////////
    function _encodeInitializationARguments(TestDataForInitialize memory t) internal pure returns (bytes memory initializationArguments) {
        /*
        function initialize(
            address _owner,
            bytes32 _name,
            address payable _someAddress,
            address _addressTwo,
            bool _someBool,
            uint256 _maxSupply)
         */
        initializationArguments = abi.encodeWithSignature(
            "initialize(address,string,address,address,bool,uint256)",
            t._owner, t._name, t._someAddress, t._addressTwo, t._someBool, t._maxSupply);
    }
}
