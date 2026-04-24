#![no_std]

use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, symbol_short, token::TokenClient, Address,
    Env, Symbol, Vec,
};

#[cfg(test)]
extern crate std;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bounty {
    pub id: u64,
    pub creator: Address,
    pub worker: Option<Address>,
    pub reward: i128,
    pub status: Symbol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
enum DataKey {
    TokenContract,
    NextId,
    Bounty(u64),
    BountyIds,
}

#[contractevent(topics = ["bounty_created"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BountyCreated {
    pub id: u64,
}

#[contractevent(topics = ["bounty_accepted"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BountyAccepted {
    pub id: u64,
}

#[contractevent(topics = ["bounty_completed"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BountyCompleted {
    pub id: u64,
}

#[contractevent(topics = ["bounty_paid"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BountyPaid {
    pub id: u64,
}

fn status_open() -> Symbol {
    symbol_short!("OPEN")
}

fn status_accepted() -> Symbol {
    symbol_short!("ACCEPTED")
}

fn status_submitted() -> Symbol {
    symbol_short!("SUBMITTED")
}

fn status_paid() -> Symbol {
    symbol_short!("PAID")
}

fn read_token_contract(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::TokenContract)
        .expect("bounty contract is not initialized")
}

fn read_next_id(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::NextId)
        .unwrap_or(1)
}

fn write_next_id(env: &Env, next_id: u64) {
    env.storage().instance().set(&DataKey::NextId, &next_id);
}

fn bounty_ids(env: &Env) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&DataKey::BountyIds)
        .unwrap_or(Vec::new(env))
}

fn write_bounty_ids(env: &Env, ids: &Vec<u64>) {
    env.storage().persistent().set(&DataKey::BountyIds, ids);
}

fn read_bounty(env: &Env, id: u64) -> Bounty {
    env.storage()
        .persistent()
        .get(&DataKey::Bounty(id))
        .expect("bounty not found")
}

fn write_bounty(env: &Env, bounty: &Bounty) {
    env.storage()
        .persistent()
        .set(&DataKey::Bounty(bounty.id), bounty);
}

fn ensure_status(bounty: &Bounty, expected: Symbol, message: &str) {
    if bounty.status != expected {
        panic!("{}", message);
    }
}

#[contract]
pub struct BountyContract;

#[contractimpl]
impl BountyContract {
    pub fn init(env: &Env, token_contract: Address) {
        if env.storage().instance().has(&DataKey::TokenContract) {
            panic!("bounty contract already initialized");
        }

        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        write_next_id(env, 1);
        write_bounty_ids(env, &Vec::new(env));
    }

    pub fn token_contract(env: &Env) -> Address {
        read_token_contract(env)
    }

    pub fn create_bounty(env: &Env, creator: Address, reward: i128) -> u64 {
        if reward <= 0 {
            panic!("reward must be positive");
        }

        creator.require_auth();

        let token_contract = read_token_contract(env);
        let token_client = TokenClient::new(env, &token_contract);
        let contract_address = env.current_contract_address();

        token_client.transfer(&creator, &contract_address, &reward);

        let id = read_next_id(env);
        write_next_id(env, id + 1);

        let bounty = Bounty {
            id,
            creator,
            worker: None,
            reward,
            status: status_open(),
        };

        write_bounty(env, &bounty);

        let mut ids = bounty_ids(env);
        ids.push_back(id);
        write_bounty_ids(env, &ids);

        BountyCreated { id }.publish(env);
        id
    }

    pub fn accept_bounty(env: &Env, id: u64, worker: Address) {
        worker.require_auth();

        let mut bounty = read_bounty(env, id);
        ensure_status(&bounty, status_open(), "bounty is not open");
        if bounty.creator == worker {
            panic!("creator cannot accept own bounty");
        }

        bounty.worker = Some(worker);
        bounty.status = status_accepted();
        write_bounty(env, &bounty);

        BountyAccepted { id }.publish(env);
    }

    pub fn submit_bounty(env: &Env, id: u64, worker: Address) {
        worker.require_auth();

        let mut bounty = read_bounty(env, id);
        ensure_status(&bounty, status_accepted(), "bounty is not accepted");

        let assigned_worker = bounty.worker.clone().expect("worker not assigned");
        if assigned_worker != worker {
            panic!("only the assigned worker can submit");
        }

        bounty.status = status_submitted();
        write_bounty(env, &bounty);

        BountyCompleted { id }.publish(env);
    }

    pub fn approve_bounty(env: &Env, id: u64, creator: Address) {
        creator.require_auth();

        let mut bounty = read_bounty(env, id);
        if bounty.creator != creator {
            panic!("only the creator can approve");
        }

        ensure_status(&bounty, status_submitted(), "bounty is not submitted");
        let worker = bounty.worker.clone().expect("worker not assigned");

        let token_contract = read_token_contract(env);
        let token_client = TokenClient::new(env, &token_contract);
        let contract_address = env.current_contract_address();
        token_client.transfer(&contract_address, &worker, &bounty.reward);

        bounty.status = status_paid();
        write_bounty(env, &bounty);

        BountyPaid { id }.publish(env);
    }

    pub fn get_bounty(env: &Env, id: u64) -> Bounty {
        read_bounty(env, id)
    }

    pub fn list_bounties(env: &Env) -> Vec<Bounty> {
        let ids = bounty_ids(env);
        let mut bounties = Vec::new(env);

        for id in ids.iter() {
            bounties.push_back(read_bounty(env, id));
        }

        bounties
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events as _},
        token::{StellarAssetClient, TokenClient},
        Address, Env, Event,
    };

    fn setup() -> (Env, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let bounty_id = env.register(BountyContract, ());
        let bounty_client = BountyContractClient::new(&env, &bounty_id);
        let asset_client = StellarAssetClient::new(&env, &token_id);
        let creator = Address::generate(&env);
        let worker = Address::generate(&env);

        bounty_client.init(&token_id);

        asset_client.mint(&creator, &1_000);

        (env, token_id, bounty_id, creator, worker)
    }

    #[test]
    fn create_bounty_locks_tokens() {
        let (env, token_id, bounty_id, creator, _worker) = setup();
        let token_client = TokenClient::new(&env, &token_id);
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let bounty = bounty_client.create_bounty(&creator, &250);

        assert_eq!(bounty, 1);
        assert_eq!(token_client.balance(&creator), 750);
        assert_eq!(token_client.balance(&bounty_id), 250);

        let stored = bounty_client.get_bounty(&bounty);
        assert_eq!(stored.status, status_open());
    }

    #[test]
    fn accept_bounty_updates_worker() {
        let (env, _token_id, bounty_id, creator, worker) = setup();
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let bounty = bounty_client.create_bounty(&creator, &200);

        bounty_client.accept_bounty(&bounty, &worker);

        let stored = bounty_client.get_bounty(&bounty);
        assert_eq!(stored.status, status_accepted());
        assert_eq!(stored.worker, Some(worker));
    }

    #[test]
    #[should_panic(expected = "creator cannot accept own bounty")]
    fn creator_cannot_accept_own_bounty() {
        let (env, _token_id, bounty_id, creator, _worker) = setup();
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let bounty = bounty_client.create_bounty(&creator, &200);

        bounty_client.accept_bounty(&bounty, &creator);
    }

    #[test]
    fn approve_bounty_pays_worker() {
        let (env, token_id, bounty_id, creator, worker) = setup();
        let token_client = TokenClient::new(&env, &token_id);
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let bounty = bounty_client.create_bounty(&creator, &300);

        bounty_client.accept_bounty(&bounty, &worker);

        bounty_client.submit_bounty(&bounty, &worker);

        bounty_client.approve_bounty(&bounty, &creator);

        assert_eq!(token_client.balance(&worker), 300);

        let stored = bounty_client.get_bounty(&bounty);
        assert_eq!(stored.status, status_paid());
    }

    #[test]
    fn submit_bounty_sets_submitted_status() {
        let (env, _token_id, bounty_id, creator, worker) = setup();
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let bounty = bounty_client.create_bounty(&creator, &150);
        bounty_client.accept_bounty(&bounty, &worker);
        bounty_client.submit_bounty(&bounty, &worker);

        let stored = bounty_client.get_bounty(&bounty);
        assert_eq!(stored.status, status_submitted());
    }

    #[test]
    #[should_panic(expected = "only the creator can approve")]
    fn unauthorized_approve_fails() {
        let (env, _token_id, bounty_id, creator, worker) = setup();
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let bounty = bounty_client.create_bounty(&creator, &150);

        bounty_client.accept_bounty(&bounty, &worker);

        bounty_client.submit_bounty(&bounty, &worker);

        bounty_client.approve_bounty(&bounty, &worker);
    }

    #[test]
    fn token_transfer_works() {
        let (env, token_id, _bounty_id, creator, worker) = setup();
        let token_client = TokenClient::new(&env, &token_id);

        token_client.transfer(&creator, &worker, &120);

        assert_eq!(token_client.balance(&creator), 880);
        assert_eq!(token_client.balance(&worker), 120);
    }

    #[test]
    fn list_bounties_returns_all_bounties() {
        let (env, _token_id, bounty_id, creator, worker) = setup();
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let first = bounty_client.create_bounty(&creator, &100);
        bounty_client.accept_bounty(&first, &worker);

        let second = bounty_client.create_bounty(&creator, &50);

        let list = bounty_client.list_bounties();
        assert_eq!(list.len(), 2);
        assert_eq!(list.get(0).unwrap().id, first);
        assert_eq!(list.get(1).unwrap().id, second);
    }

    #[test]
    fn bounty_events_are_published() {
        let (env, _token_id, bounty_id, creator, worker) = setup();
        let bounty_client = BountyContractClient::new(&env, &bounty_id);

        let bounty = bounty_client.create_bounty(&creator, &175);
        assert_eq!(
            env.events().all().filter_by_contract(&bounty_id),
            std::vec![BountyCreated { id: bounty }.to_xdr(&env, &bounty_id)]
        );

        bounty_client.accept_bounty(&bounty, &worker);
        assert_eq!(
            env.events().all().filter_by_contract(&bounty_id),
            std::vec![BountyAccepted { id: bounty }.to_xdr(&env, &bounty_id)]
        );

        bounty_client.submit_bounty(&bounty, &worker);
        assert_eq!(
            env.events().all().filter_by_contract(&bounty_id),
            std::vec![BountyCompleted { id: bounty }.to_xdr(&env, &bounty_id)]
        );

        bounty_client.approve_bounty(&bounty, &creator);
        assert_eq!(
            env.events().all().filter_by_contract(&bounty_id),
            std::vec![BountyPaid { id: bounty }.to_xdr(&env, &bounty_id)]
        );
    }
}
