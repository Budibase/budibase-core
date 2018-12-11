import {setupAppheirarchy, basicAppHeirarchyCreator_WithFields_AndIndexes} from "./specHelpers";
import { joinKey } from "../src/common";
import {some} from "lodash";

describe("buildIndex > Global index", () => {

    it("should index a record when record node is not decendant", async () => {
        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        
        customer.surname = "thedog";
        
        await recordApi.save(customer);

        const outstandingInvoice = recordApi.getNewChild(
            customer.key(),
            "invoices",
            "invoice"
        );

        outstandingInvoice.totalIncVat = 100;
        outstandingInvoice.paidAmount = 50;

        await recordApi.save(outstandingInvoice);

        const paidInvoice = recordApi.getNewChild(
            customer.key(),
            "invoices",
            "invoice"
        );

        paidInvoice.totalIncVat = 200;
        paidInvoice.paidAmount = 200;

        await recordApi.save(paidInvoice);

        const indexKey = appHeirarchy.outstandingInvoicesIndex.nodeKey();
        await indexApi.delete(indexKey);

        await indexApi.buildIndex(indexKey);
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(1);
        expect(indexItems[0].key).toBe(outstandingInvoice.key());
    });

    it("should index records from 2 seperate tree branches", async () => {
        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        
        customer.surname = "thedog";
        
        await recordApi.save(customer);

        const invoice = recordApi.getNewChild(
            customer.key(),
            "invoices",
            "invoice"
        );

        invoice.totalIncVat = 100;
        invoice.paidAmount = 50;

        await recordApi.save(invoice);

        const partner = recordApi.getNew(
            appHeirarchy.partnersCollection.nodeKey(),
            "partner");
        
        partner.surname = "thedog";
        
        await recordApi.save(partner);

        const partnerInvoice = recordApi.getNewChild(
            partner.key(),
            "invoices",
            "invoice"
        );

        partnerInvoice.totalIncVat = 100;
        partnerInvoice.paidAmount = 50;

        await recordApi.save(partnerInvoice);

        const indexKey = appHeirarchy.outstandingInvoicesIndex.nodeKey();
        await indexApi.delete(indexKey);

        await indexApi.buildIndex(indexKey);
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(2);
        expect(indexItems[0].key).toBe(invoice.key());
        expect(indexItems[1].key).toBe(partnerInvoice.key());

    });

});

describe("buildIndex > TopLevelCollection", () => {

    it("should index a record when it is a nested decendant of the collection node", async() => {
        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        
        customer.surname = "thedog";
        
        await recordApi.save(customer);

        const invoice = recordApi.getNewChild(
            customer.key(),
            "invoices",
            "invoice"
        );

        invoice.totalIncVat = 100;
        invoice.paidAmount = 50;

        await recordApi.save(invoice);

        const indexKey = appHeirarchy.customerInvoicesIndex.nodeKey();
        await indexApi.delete(indexKey);

        await indexApi.buildIndex(indexKey);
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(1);
        expect(indexItems[0].key).toBe(invoice.key());

    });

    it("should not index a record when it is not decendant", async() => {
        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const partner = recordApi.getNew(
            appHeirarchy.partnersCollection.nodeKey(),
            "partner");
        
        partner.surname = "thedog";
        
        await recordApi.save(partner);

        const invoice = recordApi.getNewChild(
            partner.key(),
            "invoices",
            "invoice"
        );

        invoice.totalIncVat = 100;
        invoice.paidAmount = 50;

        await recordApi.save(invoice);

        const indexKey = appHeirarchy.customerInvoicesIndex.nodeKey();
        await indexApi.delete(indexKey);

        await indexApi.buildIndex(indexKey);
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(0);

    });

});

describe("buildIndex > nested collection", () => {

    it("should build a single record into index", async () => {

        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        
        customer.surname = "thedog";
        
        await recordApi.save(customer);

        const invoice = recordApi.getNewChild(
            customer.key(),
            "invoices",
            "invoice"
        );

        invoice.totalIncVat = 100;
        invoice.paidAmount = 50;

        await recordApi.save(invoice);

        const indexKey = joinKey(customer.key(), "invoices", "default");
        await indexApi.delete(indexKey);

        await indexApi.buildIndex(
            appHeirarchy.invoicesCollection.indexes[0].nodeKey());
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(1);
        expect(indexItems[0].key).toBe(invoice.key());

    });

    it("should build multiple records, from different parents into index", async () => {

        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        
        customer.surname = "thedog";
        
        await recordApi.save(customer);

        const invoice = recordApi.getNewChild(
            customer.key(),
            "invoices",
            "invoice"
        );

        invoice.totalIncVat = 100;
        invoice.paidAmount = 50;

        await recordApi.save(invoice);

        const customer2 = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        
        customer2.surname = "thedog";
        
        await recordApi.save(customer2);

        const invoice2 = recordApi.getNewChild(
            customer2.key(),
            "invoices",
            "invoice"
        );

        invoice2.totalIncVat = 100;
        invoice2.paidAmount = 50;

        await recordApi.save(invoice2);

        const indexKey = joinKey(customer.key(), "invoices", "default");
        await indexApi.delete(indexKey);

        await indexApi.buildIndex(
            appHeirarchy.invoicesCollection.indexes[0].nodeKey());
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(2);
        expect(some(indexItems, i => i.key === invoice.key())).toBeTruthy();
        expect(some(indexItems, i => i.key === invoice2.key())).toBeTruthy();

    });

});

describe("buildIndex > sharded index", () => {

    it("should index a record into a sharded index", async() => {
        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        
        customer.surname = "thedog";
        
        await recordApi.save(customer);

        const indexKey = appHeirarchy
                            .customersBySurnameIndex
                            .nodeKey();

        await indexApi.delete(indexKey);

        await indexApi.buildIndex(indexKey);
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(1);
        expect(indexItems[0].key).toBe(customer.key());

    });

    it("should index multiple record into a sharded index", async() => {
        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer1 = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        customer1.surname = "thedog";
        await recordApi.save(customer1);

        const customer2 = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        customer2.surname = "Zeecat";
        await recordApi.save(customer2);

        const indexKey = appHeirarchy
                            .customersBySurnameIndex
                            .nodeKey();

        await indexApi.delete(indexKey);

        await indexApi.buildIndex(indexKey);
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(2);
        expect(some(indexItems, i => i.key === customer1.key())).toBeTruthy();
        expect(some(indexItems, i => i.key === customer2.key())).toBeTruthy();

    });

    it("should index multiple records into a sharded and nested index", async() => {
        const {recordApi, indexApi, appHeirarchy} = await setupAppheirarchy(
            basicAppHeirarchyCreator_WithFields_AndIndexes
        );

        const customer = recordApi.getNew(
            appHeirarchy.customersCollection.nodeKey(),
            "customer");
        customer.surname = "thedog";
        await recordApi.save(customer);

        const invoiceCollectionKey = joinKey(
            customer.key(), "invoices");

        const invoice1 = recordApi.getNew(
            invoiceCollectionKey,
            "invoice"
        );
        invoice1.totalIncVat = 10;
        invoice1.paidAmount = 10;
        await recordApi.save(invoice1);

        const invoice2 = recordApi.getNew(
            invoiceCollectionKey,
            "invoice"
        );
        invoice2.totalIncVat = 10;
        invoice2.paidAmount = 0;
        await recordApi.save(invoice2);

        const indexKey = joinKey(
            invoiceCollectionKey, 
            appHeirarchy.invoicesByOutstandingIndex.name);

        await indexApi.delete(indexKey);

        await indexApi.buildIndex(
            appHeirarchy.invoicesByOutstandingIndex.nodeKey());
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(2);
        expect(some(indexItems, i => i.key === invoice1.key())).toBeTruthy();
        expect(some(indexItems, i => i.key === invoice2.key())).toBeTruthy();

        const outstandingRange = {totalIncVat:1, paidAmount:0};
        const outstandingItems = await indexApi.listItems(indexKey, outstandingRange, outstandingRange);
        expect(outstandingItems.length).toBe(1);

    });

    it("should build reverse reference index", async () => {
        const {recordApi, indexApi, appHeirarchy} = 
            await setupAppheirarchy(
                basicAppHeirarchyCreator_WithFields_AndIndexes
            );

        const referencedCustomer = recordApi.getNew("/customers", "customer");
        referencedCustomer.surname = "Zecat";
        await recordApi.save(referencedCustomer);

        const referencingCustomer = recordApi.getNew("/customers", "customer");
        referencingCustomer.surname = "Ledog";
        referencingCustomer.referredBy = {
            key: referencedCustomer.key(), value: referencedCustomer.surname
        };
        referencingCustomer.isalive = true;

        await recordApi.save(referencingCustomer);

        const indexKey = joinKey(referencedCustomer.key(), "referredToCustomers");

        await indexApi.delete(indexKey);

        await indexApi.buildIndex(
            appHeirarchy.referredToCustomersReverseIndex.nodeKey());

        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(1);
        expect(some(indexItems, i => i.key === referencingCustomer.key())).toBeTruthy();
    });

});

describe("buildIndex > reverse reference index", () => {

    it("should build a single record into index", async () => {
        const {recordApi, indexApi, appHeirarchy} = 
            await setupAppheirarchy(
                basicAppHeirarchyCreator_WithFields_AndIndexes
            );

        const partner1 = recordApi.getNew("/partners", "partner");
        partner1.businessName = "ACME inc";
        await recordApi.save(partner1);

        const customer = recordApi.getNew("/customers", "customer");
        customer.surname = "Ledog";
        customer.partner = {
            key: partner1.key(), value: partner1.businessName
        };
        customer.isalive = true;

        await recordApi.save(customer);

        const indexKey = joinKey(partner1.key(), "partnerCustomers");

        await indexApi.delete(indexKey);

        await indexApi.buildIndex(
            appHeirarchy.partnerCustomersReverseIndex.nodeKey());
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(1);
        expect(some(indexItems, i => i.key === customer.key())).toBeTruthy();
    });

    it("should build multiple records into an index, when referencing same record", async () => {
        const {recordApi, indexApi, appHeirarchy} = 
            await setupAppheirarchy(
                basicAppHeirarchyCreator_WithFields_AndIndexes
            );

        const partner1 = recordApi.getNew("/partners", "partner");
        partner1.businessName = "ACME inc";
        await recordApi.save(partner1);

        const customer1 = recordApi.getNew("/customers", "customer");
        customer1.surname = "Ledog";
        customer1.partner = {
            key: partner1.key(), value: partner1.businessName
        };
        customer1.isalive = true;

        await recordApi.save(customer1);

        const customer2 = recordApi.getNew("/customers", "customer");
        customer2.surname = "Zeecat";
        customer2.partner = {
            key: partner1.key(), value: partner1.businessName
        };
        customer2.isalive = true;

        await recordApi.save(customer2);

        const indexKey = joinKey(partner1.key(), "partnerCustomers");

        await indexApi.delete(indexKey);

        await indexApi.buildIndex(
            appHeirarchy.partnerCustomersReverseIndex.nodeKey());
        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(2);
        expect(some(indexItems, i => i.key === customer1.key())).toBeTruthy();
        expect(some(indexItems, i => i.key === customer2.key())).toBeTruthy();
    });


    it("should build multiple records into seperate indexes, when referencing different records", async () => {
        const {recordApi, indexApi, appHeirarchy} = 
            await setupAppheirarchy(
                basicAppHeirarchyCreator_WithFields_AndIndexes
            );

        const partner1 = recordApi.getNew("/partners", "partner");
        partner1.businessName = "ACME inc";
        await recordApi.save(partner1);

        const partner2 = recordApi.getNew("/partners", "partner");
        partner2.businessName = "ACME inc";
        await recordApi.save(partner2);

        const customer1 = recordApi.getNew("/customers", "customer");
        customer1.surname = "Ledog";
        customer1.partner = {
            key: partner1.key(), value: partner1.businessName
        };
        customer1.isalive = true;

        await recordApi.save(customer1);

        const customer2 = recordApi.getNew("/customers", "customer");
        customer2.surname = "Zeecat";
        customer2.partner = {
            key: partner2.key(), value: partner1.businessName
        };
        customer2.isalive = true;

        await recordApi.save(customer2);

        const indexKey1 = joinKey(partner1.key(), "partnerCustomers");
        const indexKey2 = joinKey(partner2.key(), "partnerCustomers");

        await indexApi.delete(indexKey1);

        await indexApi.delete(indexKey2);

        await indexApi.buildIndex(
            appHeirarchy.partnerCustomersReverseIndex.nodeKey());

        const indexItems1 = await indexApi.listItems(indexKey1);

        expect(indexItems1.length).toBe(1);
        expect(some(indexItems1, i => i.key === customer1.key())).toBeTruthy();

        const indexItems2 = await indexApi.listItems(indexKey2);

        expect(indexItems2.length).toBe(1);
        expect(some(indexItems2, i => i.key === customer2.key())).toBeTruthy();
    });

    it("should build record into index, when referencing and referenced records are in multiple nested collections", async () => {
        const {recordApi, indexApi, appHeirarchy} = 
            await setupAppheirarchy(
                basicAppHeirarchyCreator_WithFields_AndIndexes
            );

        const partner = recordApi.getNew("/partners", "partner");
        partner.businessName = "ACME inc";
        await recordApi.save(partner);

        const partnerInvoice = recordApi.getNew(
            joinKey(partner.key(), "invoices"), "invoice"
        );
        await recordApi.save(partnerInvoice);
 

        const customer = recordApi.getNew("/customers", "customer");
        customer.surname = "Ledog";
        await recordApi.save(customer);

        const customerInvoice = recordApi.getNew(
            joinKey(customer.key(), "invoices"), "invoice"
        );
        await recordApi.save(customerInvoice);

        const charge = recordApi.getNew(
            joinKey(customerInvoice.key(), "charges"), "charge"
        );
        charge.partnerInvoice = {
            key: partnerInvoice.key(), value: "something"
        };
        await recordApi.save(charge);


        const indexKey = joinKey(partnerInvoice.key(), "partnerCharges");

        await indexApi.delete(indexKey);

        await indexApi.buildIndex(
            appHeirarchy.partnerChargesReverseIndex.nodeKey());

        const indexItems = await indexApi.listItems(indexKey);

        expect(indexItems.length).toBe(1);
        expect(some(indexItems, i => i.key === charge.key())).toBeTruthy();
    });

});