import {getNewRootLevel, 
        getNewRecordTemplate, getNewIndexTemplate,
        createNodeErrors, constructHeirarchy,
        getNewAggregateGroupTemplate, getNewSingleRecordTemplate,
        getNewAggregateTemplate} 
        from "./createNodes";
import {getNewField, validateField, 
        addField, fieldErrors} from "./fields";
import {getNewRecordValidationRule, commonRecordValidationRules,
        addRecordValidationRule} from "./recordValidationRules";
import {createAction, createTrigger} from "./createActions";
import {validateTriggers, validateTrigger, 
        validateActions, validateAll} from "./validate";
import {getApplicationDefinition} from "./getApplicationDefinition"
import {saveApplicationHeirarchy} from "./saveApplicationHeirarchy";
import {saveActionsAndTriggers} from "./saveActionsAndTriggers";

const api = app => ({
    
    getApplicationDefinition : getApplicationDefinition(app.datastore),
    saveApplicationHeirarchy : saveApplicationHeirarchy(app),
    saveActionsAndTriggers : saveActionsAndTriggers(app),
    getBehaviourSources: () => getBehaviourSources(app.datastore),
    getNewRootLevel,  
    getNewIndexTemplate, getNewRecordTemplate,
    getNewField, validateField, addField, fieldErrors,
    getNewRecordValidationRule, commonRecordValidationRules, 
    addRecordValidationRule, createAction, createTrigger, validateActions,
    validateTrigger, getNewAggregateGroupTemplate,
    getNewAggregateTemplate, constructHeirarchy, getNewSingleRecordTemplate
});


export const getTemplateApi = app => api(app);

export const errors = createNodeErrors;

export default getTemplateApi;
