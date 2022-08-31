const createSCIMError = (errorMessage, statusCode) => {
    return {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: errorMessage,
        status: statusCode,
    };
};

const createSCIMUserList = (resources, startIndex, totalResults) => {
    let scimResource = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: parseInt(startIndex, 10),
        totalResults,
        itemsPerPage: resources.length,
        Resources: resources,
    };
    return scimResource;
};

const createSCIMUser = (user) => {
    return (scimResource = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id: user.id,
        userName: user.email,
        name: {
            givenName: user.firstName,
            familyName: user.lastName,
        },
        emails: [
            {
                primary: true,
                value: user.email,
                type: 'work',
            },
        ],
        displayName: user.firstName + ' ' + user.lastName,
        locale: 'en-US',
        active: user.active,
        groups: [],
        meta: {
            resourceType: 'User',
        },
    });
};

const createSCIMGroupList = (resources, startIndex) => {
    let scimResource = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: resources,
        itemsPerPage: resources.length,
        startIndex: parseInt(startIndex, 10),
        totalResults: resources.length,
    };
    return scimResource;
};

const createSCIMGroup = (group, excludedAttributes) => {
    let scimResource = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        id: group?.id,
        displayName: group?.name,
        members: [],
        meta: {
            resourceType: 'Group',
        },
    };
    delete scimResource[excludedAttributes];

    return scimResource;
};

module.exports = {
    createSCIMError,
    createSCIMUserList,
    createSCIMUser,
    createSCIMGroupList,
    createSCIMGroup,
};
