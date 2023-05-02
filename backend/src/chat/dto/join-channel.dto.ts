import { IsOptional, IsString, IsNumber } from "class-validator";

export class JoinChannelDto {

	@IsNumber()
	id: number;

	@IsOptional()
	@IsString()
	password?: string
}

