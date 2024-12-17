import * as signalR from '@microsoft/signalr';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { Card } from '../types/Card';
import type { Player } from '../types/Player';
import { Methods } from './SignalRMethods';

interface SignalRContextProps {
  connection: signalR.HubConnection | null;
  createGame: (playerName: string) => Promise<void>;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  leaveGame: (gameId: string) => Promise<void>;
  readyUp: (gameId: string) => Promise<void>;
  unready: (gameId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  getHand: (gameId: string) => Promise<void>;
  mulliganCards: (gameId: string, cardsToMulligan: number[]) => Promise<void>;
  currPlayer: Player | undefined;
  gameCode: string;
  players: Player[];
  messageLog: string[];
  gameStart: boolean;
  hand: Card[];
}

const SignalRContext = createContext<SignalRContextProps | undefined>(undefined);

export const SignalRProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [gameCode, setGameCode] = useState('');
  const [currPlayer, setCurrPlayer] = useState<Player | undefined>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [gameStart, setGameStart] = useState(false);
  const [hand, setHand] = useState<Card[]>([]);

  useEffect(() => {
    const connect = async () => {
      const apiUrl = `${import.meta.env.VITE_API_URL}/gameHub`;
      const conn = new signalR.HubConnectionBuilder()
        .withUrl(apiUrl)
        .configureLogging(signalR.LogLevel.Information)
        .build();

      conn.on("ReceiveMessage", (message: string) => {
        setMessageLog(prevLog => [...prevLog, message]);
      });

      conn.on("ErrorMessage", (message: string) => {
        console.log(message);
      });

      conn.on("GameCode", (gameCode: string) => {
        setGameCode(gameCode);
      });

      conn.on("ReceivePlayerList", (players: Player[]) => {
        const currPlayer = players.find(p => p.id === conn.connectionId);
        setCurrPlayer(currPlayer);
        setPlayers(players);
      });

      conn.on("GameStart", (start: boolean) => {
        setGameStart(start);
      });

      conn.on("CardsInHand", (hand: Card[]) => {
        setHand(hand);
      });

      await conn.start();
      setConnection(conn);
    };

    connect();

    return () => {
      if (connection) connection.stop();
    };
  }, []);

  useEffect(() => {
    if (connection) {
      window.onbeforeunload = () => {
        connection.invoke(Methods.LeaveGame, gameCode);
      }
    }
  }, [connection, gameCode]);

  const sendMessage = async (message: string) => {
    if (connection) {
      await connection.invoke("SendMessage", gameCode, message);
    }
  }

  const createGame = async (playerName: string) => {
    if (connection) {
      await connection.invoke(Methods.CreateGame, playerName).catch((error) => {
        return console.error(error.toString());
      })
    }
  }

  const joinGame = async (gameId: string, playerName: string,) => {
    if (connection) {
      await connection.invoke(Methods.JoinGame, gameId, playerName).catch((error) => {
        return console.error(error.toString());
      })

      setGameCode(gameId);
    }
  }

  const leaveGame = async (gameId: string) => {
    if (connection) {
      await connection.invoke(Methods.LeaveGame, gameId).catch((error) => {
        return console.error(error.toString());
      })
    }
  }

  const readyUp = async (gameId: string) => {
    if (connection) {
      const rawDeck = localStorage.getItem("deck");

      if (rawDeck) {
        const deck = JSON.parse(rawDeck) as Card[];
        const cardIds = deck.map(card => card.id);
        await connection.invoke("ToggleReady", gameId, true, cardIds);
      }
    }
  }

  const unready = async (gameId: string) => {
    if (connection) {
      await connection.invoke("ToggleReady", gameId, false, []);
    }
  }

  const getHand = async (gameId: string) => {
    if (connection) {
      await connection.invoke("GetHand", gameId);
    }
  }

  const mulliganCards = async (gameId: string, cardsToMulligan: number[]) => {
    if (connection) {
      connection.invoke("MulliganCards", gameId, cardsToMulligan);
    }
  }

  return (
    <SignalRContext.Provider value={{
      connection,
      createGame,
      joinGame,
      leaveGame,
      readyUp,
      unready,
      sendMessage,
      getHand,
      mulliganCards,
      gameCode,
      currPlayer,
      players,
      messageLog,
      gameStart,
      hand,
    }}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = (): SignalRContextProps => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error("useSignalR must be used within a SignalRProvider");
  }
  return context;
};
