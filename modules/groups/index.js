const express = require('express');
const router = new express.Router();
const {
    createSCIMGroupList,
    createSCIMGroup,
    createSCIMError,
} = require('../../utils/scim');
const { PrismaClient } = require('@prisma/client');
const { parse } = require('scim2-parse-filter');

const prisma = new PrismaClient();

/**
 * GET {{baseUrl}}/scim/v2/Groups
 * List Groups with or without a filter
 */
router.get('/', async (req, res) => {
    try {
        const { query = {} } = req;
        const { filter, excludedAttributes } = query;
        let where = {};
        if (
            filter &&
            filter.op &&
            filter.op.toLowerCase() === 'eq' &&
            filter.attrPath === 'userName'
        ) {
            where['email'] = filter.compValue;
        } else if (
            filter &&
            filter.op &&
            filter.op.toLowerCase() === 'eq' &&
            filter.attrPath === 'displayName'
        ) {
            where['name'] = filter.compValue;
        }

        const groups = await prisma.groups.findMany({
            skip: parseInt(query?.startIndex || 1, 10) - 1,
            take: parseInt(query?.count || 100, 10),
            where,
        });
        if (!groups) {
            return res.status(404).send();
        }
        let resources = [];
        for (const group of groups) {
            resources.push(createSCIMGroup(group, excludedAttributes));
        }
        return res.send(createSCIMGroupList(resources, query.startIndex));
    } catch (error) {
        res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * GET {{baseUrl}}/scim/v2/Groups/{{groupId}}
 * Get a group by ID
 */
router.get('/:groupId', async (req, res) => {
    try {
        const {
            params: { groupId },
            query: { excludedAttributes },
        } = req;
        const group = await prisma.groups.findUnique({
            where: {
                id: groupId,
            },
        });
        if (!group) {
            return res.status(404).send();
        }
        return res.send(createSCIMGroup(group, excludedAttributes));
    } catch (error) {
        res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * POST {{baseUrl}}/scim/v2/Groups
 * Create a new group
 */
router.post('/', async (req, res) => {
    try {
        const { body } = req;
        const group = await prisma.groups.create({
            data: {
                name: body.displayName,
            },
        });
        return res.send(createSCIMGroup(group));
    } catch (error) {
        res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * PATCH {{baseUrl}}/scim/v2/Groups/{{groupId}}
 * Update a group's attribute
 */
router.patch('/:groupId', async (req, res) => {
    try {
        const {
            body,
            params: { groupId },
        } = req;

        let events = [];

        for (const operation of body['Operations']) {
            if (operation.op && operation.op.toLowerCase() === 'replace') {
                if (!operation.path) {
                    events.push(
                        prisma.groups.update({
                            where: {
                                id: groupId,
                            },
                            data: {
                                name: operation.value.displayName,
                            },
                        })
                    );
                }

                if (operation.path === 'displayName') {
                    events.push(
                        prisma.groups.update({
                            where: {
                                id: groupId,
                            },
                            data: {
                                name: operation.value,
                            },
                        })
                    );
                }
            } else if (
                operation.op &&
                operation.op.toLowerCase() === 'add' &&
                operation.path === 'members'
            ) {
                for (const row of operation.value) {
                    events.push(
                        prisma.membership.create({
                            data: {
                                groupId,
                                userId: row.value,
                                role: 'TEST',
                            },
                        })
                    );
                }
            } else if (
                operation.op &&
                operation.op.toLowerCase() === 'remove'
            ) {
                const { attrPath, valFilter } = parse(operation.path);
                console.log(valFilter);
                if (attrPath === 'members') {
                    events.push(
                        prisma.membership.deleteMany({
                            where: {
                                groupId,
                                userId: valFilter.compValue,
                            },
                        })
                    );
                }
            }
        }

        const [group] = await Promise.all(events);

        if (!group) {
            return res.status(404).send();
        }
        return res.send(createSCIMGroup(group));
    } catch (error) {
        return res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * PUT {{baseUrl}}/scim/v2/Groups/{{groupId}}
 * Update a group's attribute
 */
router.put('/:groupId', async (req, res) => {
    try {
        const { body } = req;

        let operation = body['Operations'][0]['op'];

        if (operation && operation.toLowerCase() === 'replace') {
            const group = await prisma.groups.update({
                where: {
                    id: body['Operations'][0].value.id,
                },
                data: {
                    name: body['Operations'][0].value.displayName,
                },
            });
            return res.send(createSCIMGroup(group));
        }
    } catch (error) {
        return res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * DELETE {{baseUrl}}/scim/v2/Groups/{{groupId}}
 * Delete a group by ID
 */
router.delete('/:groupId', async (req, res) => {
    try {
        await prisma.groups.delete({
            where: {
                id: req.params.groupId,
            },
        });
        return res.status(204).send();
    } catch (error) {
        res.status(500).send(createSCIMError(error.message, 500));
    }
});

module.exports = router;
