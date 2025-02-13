using backend.Models;
using Microsoft.Data.Sqlite;
using SQLitePCL;
using System.Data;
using System.Collections.Generic;

namespace backend.Repositories
{
	public interface ICardRepository
	{
		List<Card> GetBaseCards();
		Card GetCardById(int id);
		Boolean IsDeckLegal(List<int> cardIds);
	}

	public class CardRepository : ICardRepository
	{
		private readonly List<Card> _cards = new List<Card>();
		private readonly int MAX_STANDARD = 2;
		private readonly int MAX_LEGENDARY = 1;

        private void PopulateCards(SqliteConnection connection)
        {
            var command = connection.CreateCommand();
            command.CommandText = @"
                    SELECT c.*, r.Offset, r.Colour 
                    FROM Cards c 
                    LEFT JOIN Ranges r 
                    ON c.Id = r.CardId;";

            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    var card = _cards.Find(c => c.Id == reader.GetInt32(0));
                    var offsetString = reader.IsDBNull(11) ? null : reader.GetString(11);
                    var colour = reader.IsDBNull(12) ? null : reader.GetString(12);

                    if (card != null && offsetString != null && colour != null)
                    {
                        card.AddRangeCell(offsetString, colour);
                    }
                    else
                    {
                        card = new Card
                        {
                            Id = reader.GetInt32(0),
                            Name = reader.GetString(1),
                            Rank = reader.GetInt32(2),
                            Power = reader.GetInt32(3),
                            Rarity = reader.GetString(4),
                            Image = reader.GetString(6),
                        };

                        Ability ability = new Ability()
                        {
                            Description = reader.GetString(5),
                            Condition = reader.GetString(7),
                            Action = reader.IsDBNull(8) ? null : reader.GetString(8),
                            Target = reader.IsDBNull(9) ? null : reader.GetString(9),
                            Value = reader.IsDBNull(10) ? null : reader.GetInt32(10),
                        };

                        card.Ability = ability;

                        if (card.Ability.Action == "+R" && ability.Value != null)
                        {
                            card.RankUpAmount = (int)ability!.Value;
                        }

                        if (offsetString != null && colour != null)
                        {
                            card.AddRangeCell(offsetString, colour);
                        }

                        _cards.Add(card);
                    }
                }
            }
        }

        private void SetChildCards(SqliteConnection connection)
        {
            var command = connection.CreateCommand();
            command.CommandText = @"SELECT * FROM ParentChild";

            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    var parentID = reader.GetInt32(0);
                    var childID = reader.GetInt32(1);

                    _cards[parentID - 1].AddChild(_cards[childID - 1]);
                }
            }
        }

        public CardRepository()
        {
            SQLitePCL.Batteries.Init();

            var connectionString = "Data Source=QB_card_info.db";
            using (var connection = new SqliteConnection(connectionString))
            {
                connection.Open();
                PopulateCards(connection);
                SetChildCards(connection);
            }
        }

		public List<Card> GetBaseCards ()
		{
			// There are 145 base cards
			return _cards.GetRange(0, 145);
		}

		public Card GetCardById (int id)
		{
			// Decrement since list starts at index 0.
			return _cards[id-1];
		}

		public Boolean IsDeckLegal(List<int> cardIds)
		{
			if (cardIds.Count != 15) return false;

			var compressedDeck = new Dictionary<int, int>();

			foreach (var cardId in cardIds)
			{
				if (!compressedDeck.ContainsKey(cardId))
				{
					compressedDeck.Add(cardId, 1);
				} else
				{
					compressedDeck[cardId]++;
				}
			}

			foreach (var cardId in compressedDeck.Keys)
			{
				Card card = GetCardById(cardId);
				if (
					(card.Rarity == "Standard" && compressedDeck[cardId] > MAX_STANDARD) ||
					(card.Rarity == "Legendary" && compressedDeck[cardId] > MAX_LEGENDARY)
				) {
					return false;
				}
			}

			return true;
		}
	}
}
