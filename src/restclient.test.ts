import { RestClient } from './restclient'

describe('RestClient', () => {
  describe('constructor', () => {
    test.each([[null], ['string'], [{}]])(
      'Throws when middleware is not an array (%j)',
      value => {
        // Act
        let act = () => new RestClient(value)

        // Assert
        expect(act).toThrow(new TypeError('Middleware stack must be an array'))
      }
    )
  })

  describe('send', () => {
    it('Throws exception when send is called with no middleware registered', () => {
      // Arrange
      let sut = new RestClient()

      // Act
      let act = () => sut.send({})

      // Assert
      expect(act).toThrow(
        new Error(
          'Reached end of pipeline. Use a middleware which terminates the pipeline.'
        )
      )
    })

    it('Throws if no middleware terminates', () => {
      // Arrange
      let sut = new RestClient().use((r, n) => n(r))

      // Act
      let act = () => sut.send({})

      // Assert
      expect(act).toThrow(
        new Error(
          'Reached end of pipeline. Use a middleware which terminates the pipeline.'
        )
      )
    })

    it('Calls middleware in order', () => {
      // Arrange
      let order = ''
      let sut = new RestClient()
        .use((r, n) => {
          order += '1'
          return n(r)
        })
        .use((r, n) => {
          order += '2'
          return n(r)
        })
        .use((r, n) => {
          order += '3'
          return {}
        })

      // Act
      sut.send({})

      // Assert
      expect(order).toEqual('123')
    })

    it('Lets middleware switch request', () => {
      // Arrange
      let middleware = jest.fn((r, n) => ({}))
      let sut = new RestClient()
        .use((r, n) => {
          return n({ changed: true })
        })
        .use(middleware)

      // Act
      sut.send({})

      // Assert
      expect(middleware).toBeCalledWith({ changed: true }, expect.any(Function))
    })

    it('Does not call middleware if one terminates earlier in the pipeline', () => {
      // Arrange
      let middleware = jest.fn()
      let sut = new RestClient()
        .use((r, n) => {
          return {}
        })
        .use(middleware)

      // Act
      sut.send({})

      // Assert
      expect(middleware).not.toBeCalled()
    })

    it('Uses current request if middleware calls next without a request', () => {
      // Arrange
      let middleware = jest.fn((r, n) => ({}))

      let sut = new RestClient().use((_, n) => n()).use(middleware)

      // Act
      sut.send({ changed: false })

      // Assert
      expect(middleware).toBeCalledWith(
        { changed: false },
        expect.any(Function)
      )
    })
  })

  describe('$send', () => {
    it('Returns body of result', async () => {
      // Arrange
      let sut = new RestClient().use(() => ({ status: 200, body: 'body' }))

      // Act
      let response = await sut.$send({})

      // Assert
      expect(response).toBe('body')
    })

    test('Requires validation', async () => {
      // Arrange
      let sut = new RestClient().use(r => Promise.resolve({ body: r }))

      // Act
      let act = await sut.$send({})

      // Assert
      expect(act).toEqual({ validate: true })
    })
  })
})
