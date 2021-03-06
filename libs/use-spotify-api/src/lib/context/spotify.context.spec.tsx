import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import {
  useSetSpotifyToken,
  useSpotifyDispatch,
  useSpotifyState,
} from "./spotify.context";
import { renderWithContext } from "../../test-utils/render-with-context";

const StateConsumer = () => {
  const state = useSpotifyState();

  return (
    <>
      <p data-testid="token">{state.tokenData?.token || "NO_TOKEN"}</p>
      <p data-testid="validUntil">
        {state.tokenData?.validUntil?.toISOString() || "NO_VALID_UNTIL"}
      </p>
    </>
  );
};

jest.useFakeTimers();
jest.setSystemTime(0);
beforeEach(jest.resetAllMocks);
describe("SpotifyContextProvider", () => {
  it("should have initial state", () => {
    renderWithContext(<StateConsumer />);

    [
      ["token", "NO_TOKEN"],
      ["validUntil", "NO_VALID_UNTIL"],
    ].forEach(([id, expectedValue]) => {
      expect(screen.getByTestId(id as string).innerHTML).toEqual(expectedValue);
    });
  });

  it("should auto detect token", async () => {
    const token = "MY_TOKEN";
    const expiresIn = 1000;
    jest.setSystemTime(0);
    jest.spyOn(window, "location", "get").mockReturnValue({
      hash: `#access_token=${token}&expires_in=${expiresIn}`,
    } as any);

    renderWithContext(<StateConsumer />, {});

    const expectedDate = new Date(Date.now() + expiresIn * 1000);

    expect((await screen.findByTestId("token")).innerHTML).toEqual(token);
    expect((await screen.findByTestId("validUntil")).innerHTML).toEqual(
      expectedDate.toISOString()
    );
  });

  it("should invoke token callback if provided", async () => {
    const token = "MY_TOKEN";
    const expiresIn = 1000;
    jest.setSystemTime(0);
    jest.spyOn(window, "location", "get").mockReturnValue({
      hash: `#access_token=${token}&expires_in=${expiresIn}`,
    } as any);

    const handleTokenObtainedMock = jest.fn();
    renderWithContext(<StateConsumer />, {
      onTokenObtained: handleTokenObtainedMock,
    });

    const expectedDate = new Date(Date.now() + expiresIn * 1000);
    expect(handleTokenObtainedMock).toBeCalledWith({
      token,
      validUntil: expectedDate,
    });
  });

  it("should throw an error unsupported action type is dispatched", async () => {
    const token = "MY_TOKEN";
    const expiresIn = 1000;
    jest.spyOn(console, "error").mockReturnValue();
    jest.spyOn(window, "location", "get").mockReturnValue({
      hash: `#access_token=${token}&expires_in=${expiresIn}`,
    } as any);
    const Component = () => {
      const dispatch = useSpotifyDispatch();
      dispatch({ type: "RANDOM" } as any);
      return null;
    };

    expect(() => renderWithContext(<Component />)).toThrow(
      "unhandled action type"
    );
  });
});

it("useSpotifyState should throw an error if used outside the context", () => {
  jest.spyOn(console, "error").mockReturnValue();
  expect(() => render(<StateConsumer />)).toThrow(
    "must be used within a SpotifyContextProvider"
  );
});

it("useSpotifyDispatch should throw an error if used outside the context", () => {
  jest.spyOn(console, "error").mockReturnValue();
  const DispatchConsumer = () => {
    useSpotifyDispatch();
    return null;
  };
  expect(() => render(<DispatchConsumer />)).toThrow(
    "must be used within a SpotifyContextProvider"
  );
});

it("useSetSpotifyToken works correctly", async () => {
  const token = "SetTokenComponent";
  const SetTokenComponent = () => {
    const setToken = useSetSpotifyToken();
    const state = useSpotifyState();
    useEffect(() => {
      setToken({
        token,
      });
    }, []);

    return <p data-testid="token">{state.tokenData?.token}</p>;
  };

  jest.spyOn(window, "location", "get").mockReturnValue({
    hash: ``,
  } as any);
  renderWithContext(<SetTokenComponent />);
  expect((await screen.findByTestId("token")).innerHTML).toEqual(token);
});
