import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3001";

/** API Class.
 *
 * Static class tying together methods used to get/send to to the API.
 */

export default class ProPulseApi {
  // the token for interaction with the API will be stored here.
  static token;

  static async request(endpoint, data = {}, headers = {}, method = "get") {
    //there are multiple ways to pass an authorization token, this is how you pass it in the header.
    //this has been provided to show you another way to pass the token. you are only expected to read this code for this project.
    const url = `${BASE_URL}/${endpoint}`;
    const params = method === "get" ? data : {};
    if (Object.keys(headers).length === 0) {
      headers = {
        Authorization: `Bearer ${ProPulseApi.token}`,
      };
    }

    try {
      return (await axios({ url, method, data, params, headers })).data;
    } catch (err) {
      let message = err.response.data.error.message;
      throw Array.isArray(message) ? message : [message];
    }
  }

  // Individual API routes

  static async registerUser(data) {
    let res = await this.request("auth/register", data, {}, "post");
    return res.token;
  }

  static async loginUser(data) {
    let res = await this.request("auth/login", data, {}, "post");
    return res.token;
  }

  static async getCurrentUser(id) {
    let res = await this.request(`users/${id}`);
    return res.user;
  }

  static async updateProfile(id, data) {
    let res = await this.request(`users/${id}`, data, {}, "patch");
    return res;
  }

  static async getUser(id) {
    let res = await this.request(`users/${id}`);
    return res;
  }

  static async storeSubscription(id, data) {
    const headers = { "Content-Type": "application/json" };
    let res = await this.request(`push/subscribe/${id}`, data, headers, "post");
    console.log(res);
  }

  static async createJob(data) {
    let res = await this.request(`jobs`, data, {}, "post");
    return res;
  }

  static async getUserJobs(id) {
    let res = await this.request(`jobs/user/${id}`);
    return res;
  }

  static async getJob(id) {
    let res = await this.request(`jobs/${id}`);
    return res;
  }

  static async createPost(data, jobId) {
    let res = await this.request(`posts/${jobId}`, data, {}, "post");
    return res;
  }

  static async getPost(id) {
    let res = await this.request(`posts/${id}`);
    return res;
  }

  static async createReply(data, postId) {
    let res = await this.request(`posts/reply/${postId}`, data, {}, "post");
    return res;
  }

  static async getReply(id) {
    let res = await this.request(`posts/replies/${id}`);
    return res;
  }

  static async inviteUser(data, id) {
    let res = await this.request(`jobs/invite/${id}`, data, {}, "post");
    return res;
  }

  static async getInvite() {
    let res = await this.request(`jobs/invitation`);
    return res;
  }

  static async acceptInvite(token) {
    let res = await this.request(`jobs/accept?${token}`, {}, {}, "post");
    console.log(res);
    return res;
  }
}
