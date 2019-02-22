import {setupAppheirarchy, 
    basicAppHeirarchyCreator_WithFields} from "./specHelpers";
import { WHITELIST, permissionTypes, 
    ACCESS_LEVELS_FILE, 
    ACCESS_LEVELS_LOCK_FILE} from "../src/authApi/authCommon";
import {writeTemplatesPermission} from "../src/authApi/getNewAccessLevel";
import {cloneDeep} from "lodash/fp";
import {getLock} from "../src/common/lock";

describe("getNewAccessLevel", () => {

    it("should create item with correct properties", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const accLev = authApi.getNewAccessLevel();
        expect(accLev.name).toBe("");
        expect(accLev.accessType).toBe(WHITELIST);
        expect(accLev.permissions).toEqual([]);
    });

});

describe("validateAccessLevels", () => {

    it("should return no errors with valid access level", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const accessLevel = validAccessLevel(authApi);
        const errs = authApi.validateAccessLevels([accessLevel]);
        expect(errs).toEqual([]);
    });

    it("should error when access level name not set", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const accessLevel = validAccessLevel(authApi);
        accessLevel.name = "";
        const errs = authApi.validateAccessLevels([accessLevel]);
        expect(errs.length).toEqual(1);
        expect(errs[0].field).toBe("name");
    });

    it("should error when access type not whitelist or blacklist", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const accessLevel = validAccessLevel(authApi);
        accessLevel.accessType = ""
        const errs = authApi.validateAccessLevels([accessLevel]);
        expect(errs.length).toEqual(1);
        expect(errs[0].field).toBe("accessType");
    });

    it("should error when 2 access levels with the same name", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const accessLevel1 = validAccessLevel(authApi);
        const accessLevel2 = validAccessLevel(authApi);
        const errs = authApi.validateAccessLevels([accessLevel1, accessLevel2]);
        expect(errs.length).toEqual(2);
        expect(errs[0].field).toBe("name");
        expect(errs[0].item).toBe(accessLevel1);
        expect(errs[1].field).toBe("name");
        expect(errs[1].item).toBe(accessLevel2);
    });

    it("should error when permission is not recognised", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const accessLevel = validAccessLevel(authApi);
        accessLevel.permissions[0].type = "not valid";
        const errs = authApi.validateAccessLevels([accessLevel]);
        expect(errs.length).toEqual(1);
        expect(errs[0].field).toBe("type");
        expect(errs[0].item).toBe(accessLevel.permissions[0]);
    });

    it("should error when record permision has invalid nodeKey", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const accessLevel = validAccessLevel(authApi);
        accessLevel.permissions[0].type = permissionTypes.CREATE_RECORD;
        accessLevel.permissions[0].nodeKey = "nota a valid node key";
        const errs = authApi.validateAccessLevels([accessLevel]);
        expect(errs.length).toEqual(1);
        expect(errs[0].field).toBe("nodeKey");
        expect(errs[0].item).toBe(accessLevel.permissions[0]);
    });
});

describe("save and load access level", () => {

    it("should save and load valid access levels", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const levels = validAccessLevels(authApi);
        await authApi.saveAccessLevels(levels);
        const loadedLevels = await authApi.loadAccessLevels();
        expect(loadedLevels.levels.length).toBe(2);
        expect(loadedLevels.levels[0].name).toBe("level 1");
        expect(loadedLevels.levels[1].name).toBe("level 2");
        expect(loadedLevels.version).toBe(1);
    });

    it("should not save invalid access levels", async () => {
        const {authApi} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const levels = validAccessLevels(authApi);
        levels.levels[0].name = "";
        let e;
        try {
            await authApi.saveAccessLevels(levels);
        } catch(ex) {
            e = ex;
        }

        expect(e).toBeDefined();
        const loadedLevels = await authApi.loadAccessLevels();
        expect(loadedLevels.levels.length).toBe(0);
        expect(loadedLevels.version).toBe(0);
    });

    it("should not save access level when version has increased since loading", async () => {
        const {authApi, app} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const levels = validAccessLevels(authApi);
        const updatedLevels = cloneDeep(levels);
        updatedLevels.version = 1;
        await app.datastore.updateJson(ACCESS_LEVELS_FILE, updatedLevels);

        let e;
        try {
            await authApi.saveAccessLevels(levels);
        } catch(ex) {
            e = ex;
        }

        expect(e).toBeDefined();
        const loadedLevels = await authApi.loadAccessLevels();
        expect(loadedLevels.levels.length).toBe(2);
        expect(loadedLevels.version).toBe(1);
    });

    it("should not save access level when locked", async () => {
        const {authApi, app} = await setupAppheirarchy(basicAppHeirarchyCreator_WithFields);
        const levels = validAccessLevels(authApi);

        await getLock(app, 
            ACCESS_LEVELS_LOCK_FILE,
            10000, 0,0);

        let e;
        try {
            await authApi.saveAccessLevels(levels);
        } catch(ex) {
            e = ex;
        }

        expect(e).toBeDefined();
        const loadedLevels = await authApi.loadAccessLevels();
        expect(loadedLevels.levels.length).toBe(0);
        expect(loadedLevels.version).toBe(0);
    });

});

const validAccessLevels = (authApi) => {
    const accessLevel1 = validAccessLevel(authApi);
    accessLevel1.name = "level 1";
    const accessLevel2 = validAccessLevel(authApi);
    accessLevel2.name = "level 2";
    return {version:0, levels: [accessLevel1, accessLevel2]};
}

const validAccessLevel = (authApi) => {
    const lev = authApi.getNewAccessLevel();
    lev.name = "test level";
    writeTemplatesPermission(lev);
    return lev;        
}