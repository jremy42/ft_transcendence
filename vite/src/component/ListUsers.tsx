import { useState, useEffect } from "react";
import apiClient from '../auth/interceptor.axios'

//Mui
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

type Games = {
	date: string,
	id: string,
	score: number[]
}

type UserInfo = {
	id: number,
	username: string,
	email: string,
	password?: string, // To be removed in DTO in back
	avatar: string,
	savedGames: Games[],
	wonGames: Games[],

	states: string[],
	gameIds: string[],

	points: number,
	totalwonGames: number,
	totalplayedGames: number,

	userConnected: boolean,
}

export function ListUsers() {

	const [info, setInfo] = useState<string>("")
	const [muiTable, setMuiTable] = useState<JSX.Element>(<div>Loading...</div>)

	useEffect(() => handleClick(), [])

	function handleClick(): void {
		setInfo("Waiting for backend to send User Database...")
		apiClient
			.get("/api/users/all")
			.then(({ data }) => {
				console.log("response from all: ", data)
				setInfo("Successfully retrieved infos !")
				//Mui elements
				setMuiTable(
					<TableContainer component={Paper}>
						<Table sx={{ minWidth: 650 }} aria-label="simple table">
							<TableHead>
								<TableRow>
									<TableCell>Username</TableCell>
									<TableCell align="right">Points</TableCell>
									<TableCell align="right">Won Games</TableCell>
									<TableCell align="right">Played Games</TableCell>
									<TableCell align="right">UserId</TableCell>
									<TableCell align="right">Email</TableCell>
									<TableCell align="right">Online?</TableCell>
									<TableCell align="right">Game Status</TableCell>
									<TableCell align="right">GameId</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{data.map((elem: UserInfo) => (
									<TableRow
										key={elem.username}
										sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
									>
										<TableCell component="th" scope="row">
											{elem.username}
										</TableCell>
										<TableCell align="right">{elem.points}</TableCell>
										<TableCell align="right">{elem.totalwonGames}</TableCell>
										<TableCell align="right">{elem.totalplayedGames}</TableCell>
										<TableCell align="right">{elem.id}</TableCell>
										<TableCell align="right">{elem.email}</TableCell>
										<TableCell align="right">{(elem.userConnected) ? "Yes" : "No"}</TableCell>
										<TableCell align="right">{(elem.states.join('-') == "") ? "None" : elem.states.join('-')}</TableCell>
										<TableCell align="right">{(elem.gameIds.join('-') == "") ? "---" : elem.gameIds.join('-')}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)
			})
			.catch((error) => {
				console.log(error)
				if (error?.response?.status === 502)
					setInfo("Backend not ready yet. Try again in a few seconds")
				else
					setInfo("Error")
			})
	}

	return (
		<div>
			<button onClick={handleClick}>Update Users list</button>
			<p>{info}</p>
			{muiTable}
		</div>
	);
}
