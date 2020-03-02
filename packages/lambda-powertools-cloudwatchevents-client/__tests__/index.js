const AWS = require('aws-sdk')

const mockPutEvents = jest.fn()
AWS.CloudWatchEvents.prototype.putEvents = mockPutEvents

global.console.log = jest.fn()

const CloudWatchEvents = require('../index')
const CorrelationIds = require('@dazn/lambda-powertools-correlation-ids')

beforeEach(() => {
  mockPutEvents.mockReturnValueOnce({
    promise: async () => Promise.resolve()
  })
})

afterEach(() => {
  mockPutEvents.mockClear()

  CorrelationIds.clearAll()
})

const verifyPutEventsContext = async (f) => {
  const eventTypes = [
    'wrote_test',
    'ran_test',
    'pass_test'
  ]
  const entries = eventTypes
    .map(eventType => {
      const data = { eventType, username: 'theburningmonk' }
      return {
        Source: 'test',
        DetailType: 'test',
        Detail: JSON.stringify(data)
      }
    })
  const params = {
    Entries: entries
  }
  await CloudWatchEvents.putEvents(params).promise()

  expect(mockPutEvents).toBeCalled()
  const actualParams = mockPutEvents.mock.calls[0][0]
  actualParams.Entries.forEach(entry => {
    const actualDetail = JSON.parse(entry.Detail)
    f(actualDetail.__context__)
  })
}

const verifyPutEventsWithCorrelationIdsContext = async (correlationIds, f) => {
  const eventTypes = [
    'wrote_test',
    'ran_test',
    'pass_test'
  ]
  const entries = eventTypes
    .map(eventType => {
      const data = { eventType, username: 'theburningmonk' }
      return {
        Source: 'test',
        DetailType: 'test',
        Detail: JSON.stringify(data)
      }
    })
  const params = {
    Entries: entries
  }
  await CloudWatchEvents.putEventsWithCorrelationIds(correlationIds, params).promise()

  expect(mockPutEvents).toBeCalled()
  const actualParams = mockPutEvents.mock.calls[0][0]
  actualParams.Entries.forEach(entry => {
    const actualDetail = JSON.parse(entry.Detail)
    f(actualDetail.__context__)
  })
}

describe('CloudWatchEvents client', () => {
  describe('.putEvents', () => {
    describe('when there are no correlation IDs', () => {
      it('sends empty __context__ ', async () => {
        await verifyPutEventsContext(x => expect(x).toEqual({}))
      })
    })

    describe('when there are global correlationIds', () => {
      it('forwards them in __context__', async () => {
        const correlationIds = {
          'x-correlation-id': 'id',
          'debug-log-enabled': 'true'
        }
        CorrelationIds.replaceAllWith(correlationIds)

        await verifyPutEventsContext(x => {
          expect(x).toEqual({
            'x-correlation-id': 'id',
            'debug-log-enabled': 'true'
          })
        })
      })
    })
  })

  describe('.putEventsWithCorrelationIds', () => {
    it('forwards given correlationIds in __context__ field', async () => {
      const correlationIds = new CorrelationIds({
        'x-correlation-id': 'child-id',
        'debug-log-enabled': 'true'
      })

      await verifyPutEventsWithCorrelationIdsContext(correlationIds, x => {
        expect(x).toEqual({
          'x-correlation-id': 'child-id',
          'debug-log-enabled': 'true'
        })
      })
    })
  })
})
