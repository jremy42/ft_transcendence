import { Injectable } from '@nestjs/common';
import { Game } from './game';
import { SavedGame } from 'src/model/saved-game.entity';
import { v4 as uuidv4 } from 'uuid';
import { UUID } from '../type';
import { Server, Socket } from 'socket.io'
import { GameStatus } from './game';

//server.to(gameId).emit('message')


//import { Map } from 'immutable';

@Injectable()
export class GameCluster {
	gamesMap: Map<UUID, Game> = new Map<UUID, Game>();
	private server: Server

	constructor() {
		setInterval(() => {
			const info = []
			this.gamesMap.forEach((e) => {
				info.push(e.players.map((e) => e.user.id).join('-'))
			})
			console.log("This is the game cluster", info)
		}, 5000)
	}

	setServer(newserver: Server) {
		this.server = newserver
	}

	createGame(privateGame: boolean = false): Game {
		const game = new Game(this.generateGameId(), this.server, privateGame, this);
		this.gamesMap.set(game.id, game);
		return game;
	};

	findOne(gameId: UUID) {
		return this.gamesMap.get(gameId)
	}

	findAvailable() {
		for (const game of this.gamesMap.values()) {
			if (game.freeSlot)
				return game;
		}
		return null;
	}

	findByClient(client: Socket): Game | null {
		for (const game of this.gamesMap.values()) {
			if (game.players.find((player) => player.clientId === client.id))
				return game;
		}
		return null;
	}

	listAll() {
		const ar = []
		this.gamesMap.forEach((key, value) => {
			ar.push(JSON.stringify(value))
		})
		return ar;
	}

	private generateGameId(): UUID {
		return uuidv4();
	}


	findUserStateById(id: number) {
		let stateArray: string[] = []
		let gameIdArray: string[] = []
		for (const game of this.gamesMap.values()) {
			if (!game.players)
				continue
			if (game.players.find(player => player.user.id === id && player.leaving === false)) {
				stateArray.push("Ingame")
				gameIdArray.push(game.id)
			}
			if (game.viewers.find(viewer => viewer.id === id)) {
				stateArray.push("Watching")
				gameIdArray.push(game.id)
			}
		}
		if (stateArray.length === 0)
			stateArray.push("None")
		return { state: stateArray.join("-"), gameId: gameIdArray.join("-") }
	}

	private getClientFromSocketId(socketId: string): Socket {
		const sockets = this.server.sockets.sockets;
		return sockets.get(socketId);
	}

	rageQuit(game: Game, quitterId: number) {
		if (game.players.find(player => player.user.id === quitterId)) {
			game.players.forEach(player => {
				if (player.user.id === quitterId) {
					player.leaving = true;
					player.score = 0;
					const client = this.getClientFromSocketId(player.clientId);
					client.leave(game.playerRoom);
				}
				else {
					player.score = 5;
				}
			});
			game.status = GameStatus.end;
		}
	}

	playerQuit(gameId: UUID, userId: number) {
		const game = this.gamesMap.get(gameId);
		let gameInfo = null;

		if (!game) return;

		if (game.status === GameStatus.waiting
			&& game.players.length < 2) {
			for (const player of game.players) {
				const client = this.getClientFromSocketId(player.clientId);
				client.leave(game.playerRoom);
			}
			this.gamesMap.delete(gameId);
		}
		else if (game.status === GameStatus.playing
			|| game.status === GameStatus.start) {
			this.rageQuit(game, userId);
		}
		if (game.status === GameStatus.end) {
			const player = game.players.find(player => player.user.id === userId);
			const client = this.getClientFromSocketId(player.clientId);
			if (player)
			{
				player.leaving = true;
				client.leave(game.playerRoom);
			}
			else if (game.viewers.find(viewer => viewer.id === userId))
				client.leave(game.viewerRoom);

			if (game.players.every(player => player.leaving)) {
				gameInfo = game.generateSavedGameInfo();
				this.gamesMap.delete(gameId);
			}
		}
		return gameInfo;
	}

}
