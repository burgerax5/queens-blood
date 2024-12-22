import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import CardList from "../components/Deck/CardList";
import Selected from "../components/Deck/Selected";
import GameBackground from "../components/Game/GameBackground";
import { Card } from "../types/Card";
import { isLegalDeck, saveDeck } from "../utils/deckMethods";

const Deck = () => {
  const [deck, setDeck] = useState<Card[]>([]);

  useEffect(() => {
    const storedDeck = localStorage.getItem("deck");
    if (storedDeck) {
      const parsedDeck = JSON.parse(storedDeck) as Card[];
      if (isLegalDeck(parsedDeck))
        setDeck(parsedDeck);
    }
  }, []);

  const api = `${import.meta.env.VITE_API_URL}/api/cards/base`;

  const { isPending, error, data } = useQuery<Card[]>({
    queryKey: ["baseCards"],
    queryFn: () => fetch(api).then((res) => res.json()),
    staleTime: 60000,
  });

  if (isPending) return "Loading...";

  if (error) return "An error occurred: " + error.message;

  return (
    <div className="relative flex flex-col h-dvh">
      <Selected
        deck={deck}
        setDeck={setDeck} />

      <div className="p-6">
        <CardList
          deck={deck}
          setDeck={setDeck}
          cardsList={data} />
      </div>

      <button
        className="disabled:text-slate-500 py-2 px-4 bg-orange-300 rounded-full max-w-24 w-full mx-auto"
        disabled={!isLegalDeck(deck)} onClick={() => {
          if (isLegalDeck(deck)) {
            saveDeck(deck);
            history.back();
          }
        }}>
        Save
      </button>

      <GameBackground />
    </div>
  )
}

export default Deck