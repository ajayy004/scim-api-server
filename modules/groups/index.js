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
        const groups = await prisma.groups.findMany({
            skip: parseInt(query?.startIndex || 1, 10) - 1,
            take: parseInt(query?.count || 100, 10),
        });
        if (!groups) {
            res.status(204).send();
        }
        let resources = [];
        for (const group of groups) {
            resources.push(createSCIMGroup(group));
        }
        res.send(createSCIMGroupList(resources, query.startIndex));
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
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
        } = req;
        const group = await prisma.groups.findUnique({
            where: {
                id: groupId,
            },
        });
        if (!group) {
            res.status(204).send();
        }
        res.send(createSCIMGroup(group));
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
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
        res.send(createSCIMGroup(group));
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
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
            if (operation.op === 'replace') {
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
            } else if (operation.op === 'add' && operation.path === 'members') {
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
            } else if (operation.op === 'remove') {
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
            res.status(204).send();
        }
        res.send(createSCIMGroup(group));
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
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

        if (operation === 'replace') {
            const group = await prisma.groups.update({
                where: {
                    id: body['Operations'][0].value.id,
                },
                data: {
                    name: body['Operations'][0].value.displayName,
                },
            });
            res.send(createSCIMGroup(group));
        }
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
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
        res.status(500).send(createSCIMError('Something went wrong', 500));
    }
});

module.exports = router;
